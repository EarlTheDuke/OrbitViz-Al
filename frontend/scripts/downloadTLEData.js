/**
 * TLE Data Downloader
 * Downloads satellite TLE data from CelesTrak and bundles it for the app
 * Run with: node scripts/downloadTLEData.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// CelesTrak data sources
const SOURCES = [
  { name: 'stations', url: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=tle', priority: 1 },
  { name: 'active', url: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle', priority: 2 },
  { name: 'starlink', url: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=starlink&FORMAT=tle', priority: 3 },
  { name: 'oneweb', url: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=oneweb&FORMAT=tle', priority: 4 },
  { name: 'gps', url: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=gps-ops&FORMAT=tle', priority: 5 },
  { name: 'glonass', url: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=glo-ops&FORMAT=tle', priority: 6 },
  { name: 'galileo', url: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=galileo&FORMAT=tle', priority: 7 },
  { name: 'beidou', url: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=beidou&FORMAT=tle', priority: 8 },
  { name: 'iridium', url: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=iridium-NEXT&FORMAT=tle', priority: 9 },
  { name: 'globalstar', url: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=globalstar&FORMAT=tle', priority: 10 },
  { name: 'orbcomm', url: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=orbcomm&FORMAT=tle', priority: 11 },
  { name: 'amateur', url: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=amateur&FORMAT=tle', priority: 12 },
  { name: 'weather', url: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=weather&FORMAT=tle', priority: 13 },
  { name: 'noaa', url: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=noaa&FORMAT=tle', priority: 14 },
  { name: 'goes', url: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=goes&FORMAT=tle', priority: 15 },
  { name: 'resource', url: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=resource&FORMAT=tle', priority: 16 },
  { name: 'sarsat', url: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=sarsat&FORMAT=tle', priority: 17 },
  { name: 'dmc', url: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=dmc&FORMAT=tle', priority: 18 },
  { name: 'tdrss', url: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=tdrss&FORMAT=tle', priority: 19 },
  { name: 'geo', url: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=geo&FORMAT=tle', priority: 20 },
  { name: 'intelsat', url: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=intelsat&FORMAT=tle', priority: 21 },
  { name: 'ses', url: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=ses&FORMAT=tle', priority: 22 },
  { name: 'science', url: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=science&FORMAT=tle', priority: 23 },
  { name: 'geodetic', url: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=geodetic&FORMAT=tle', priority: 24 },
  { name: 'engineering', url: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=engineering&FORMAT=tle', priority: 25 },
  { name: 'education', url: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=education&FORMAT=tle', priority: 26 },
  { name: 'military', url: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=military&FORMAT=tle', priority: 27 },
  { name: 'radar', url: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=radar&FORMAT=tle', priority: 28 },
  { name: 'cubesat', url: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=cubesat&FORMAT=tle', priority: 29 },
  { name: 'other', url: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=other&FORMAT=tle', priority: 30 },
];

// Determine satellite type from name
function determineSatelliteType(name, category) {
  const upperName = name.toUpperCase();
  
  if (upperName.includes('ISS') || upperName.includes('TIANGONG') || 
      upperName.includes('STATION') || upperName.includes('CSS') || category === 'stations') {
    return 'station';
  }
  if (upperName.includes('DEB') || upperName.includes('DEBRIS') || upperName.includes('FRAG')) {
    return 'debris';
  }
  if (upperName.includes('R/B') || upperName.includes('ROCKET') || 
      upperName.includes('CENTAUR') || upperName.includes('BLOCK')) {
    return 'rocket-body';
  }
  return 'satellite';
}

// Parse TLE text
function parseTLEText(text, category) {
  const satellites = [];
  const lines = text.trim().split('\n').map(l => l.trim()).filter(l => l);
  
  for (let i = 0; i < lines.length - 2; i += 3) {
    const name = lines[i];
    const line1 = lines[i + 1];
    const line2 = lines[i + 2];
    
    if (line1?.startsWith('1 ') && line2?.startsWith('2 ')) {
      try {
        const noradId = parseInt(line1.substring(2, 7).trim());
        satellites.push({
          n: name.trim(),
          id: noradId,
          l1: line1,
          l2: line2,
          t: determineSatelliteType(name, category),
          c: category,
        });
      } catch (e) {
        // Skip invalid entries
      }
    }
  }
  
  return satellites;
}

// Fetch URL with timeout
function fetchURL(url, timeout = 60000) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
  });
}

// Main download function
async function downloadAll() {
  console.log('🛰️  TLE Data Downloader');
  console.log('========================\n');
  
  const allSatellites = new Map();
  
  for (const source of SOURCES) {
    process.stdout.write(`  Fetching ${source.name}... `);
    
    try {
      const data = await fetchURL(source.url);
      const satellites = parseTLEText(data, source.name);
      
      for (const sat of satellites) {
        if (!allSatellites.has(sat.id)) {
          allSatellites.set(sat.id, sat);
        }
      }
      
      console.log(`✓ ${satellites.length} satellites`);
    } catch (error) {
      console.log(`✗ Failed: ${error.message}`);
    }
  }
  
  console.log(`\n📊 Total unique satellites: ${allSatellites.size}`);
  
  // Convert to array and sort by NORAD ID
  const satelliteArray = Array.from(allSatellites.values())
    .sort((a, b) => a.id - b.id);
  
  // Create output
  const output = {
    generated: new Date().toISOString(),
    count: satelliteArray.length,
    satellites: satelliteArray,
  };
  
  // Write to file
  const outputPath = path.join(__dirname, '..', 'src', 'data', 'bundledTLEData.json');
  const outputDir = path.dirname(outputPath);
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  fs.writeFileSync(outputPath, JSON.stringify(output));
  
  const fileSizeKB = (fs.statSync(outputPath).size / 1024).toFixed(1);
  console.log(`\n✅ Saved to: src/data/bundledTLEData.json`);
  console.log(`📦 File size: ${fileSizeKB} KB`);
  console.log('\nRun this script periodically to update the bundled data.');
}

downloadAll().catch(console.error);
