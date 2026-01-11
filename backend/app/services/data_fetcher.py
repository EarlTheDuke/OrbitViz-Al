"""
Data fetching service for TLE data from multiple sources
"""

import httpx
import logging
import ssl
import certifi
from typing import List, Tuple, Optional
from datetime import datetime
import math
import asyncio

from app.services.cache import cache, SatelliteData
from app.config import settings

logger = logging.getLogger(__name__)

# Primary TLE data sources - CelesTrak GP API
TLE_SOURCES_PRIMARY = [
    {"name": "Space Stations", "url": "https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=tle"},
    {"name": "Active", "url": "https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle"},
    {"name": "Starlink", "url": "https://celestrak.org/NORAD/elements/gp.php?GROUP=starlink&FORMAT=tle"},
    {"name": "GPS", "url": "https://celestrak.org/NORAD/elements/gp.php?GROUP=gps-ops&FORMAT=tle"},
    {"name": "GLONASS", "url": "https://celestrak.org/NORAD/elements/gp.php?GROUP=glo-ops&FORMAT=tle"},
    {"name": "Galileo", "url": "https://celestrak.org/NORAD/elements/gp.php?GROUP=galileo&FORMAT=tle"},
    {"name": "Iridium NEXT", "url": "https://celestrak.org/NORAD/elements/gp.php?GROUP=iridium-NEXT&FORMAT=tle"},
]

# Backup sources - direct TLE text files
TLE_SOURCES_BACKUP = [
    {"name": "Space Stations", "url": "https://celestrak.com/NORAD/elements/stations.txt"},
    {"name": "Active", "url": "https://celestrak.com/NORAD/elements/active.txt"},
    {"name": "Visual", "url": "https://celestrak.com/NORAD/elements/visual.txt"},
    {"name": "Starlink", "url": "https://celestrak.com/NORAD/elements/supplemental/starlink.txt"},
    {"name": "GPS", "url": "https://celestrak.com/NORAD/elements/gps-ops.txt"},
]

# Alternative mirror sources (GitHub-hosted TLE archives)
TLE_SOURCES_MIRROR = [
    {"name": "Stations (Mirror)", "url": "https://raw.githubusercontent.com/bill-gray/tles/master/tle_list.txt"},
]


def parse_tle_line(line1: str, line2: str) -> dict:
    """Parse TLE lines to extract orbital elements"""
    try:
        # Extract from line 1
        norad_id = int(line1[2:7].strip())
        intl_designator = line1[9:17].strip()
        
        # Extract from line 2
        inclination = float(line2[8:16].strip())
        eccentricity = float("0." + line2[26:33].strip())
        mean_motion = float(line2[52:63].strip())
        
        # Calculate orbital period (minutes)
        period = 1440.0 / mean_motion if mean_motion > 0 else 0
        
        # Approximate altitude (km) from mean motion
        GM = 398600.4418
        T_seconds = period * 60
        if T_seconds > 0:
            semi_major_axis = (GM * (T_seconds ** 2) / (4 * math.pi ** 2)) ** (1/3)
            altitude = semi_major_axis - 6371  # Earth radius
        else:
            altitude = 0
        
        return {
            "norad_id": norad_id,
            "intl_designator": intl_designator,
            "inclination": inclination,
            "eccentricity": eccentricity,
            "period": period,
            "altitude": altitude,
        }
    except Exception as e:
        logger.warning(f"Failed to parse TLE: {e}")
        return {}


def determine_satellite_type(name: str) -> str:
    """Determine satellite type from name"""
    upper_name = name.upper()
    
    if any(x in upper_name for x in ["ISS", "TIANGONG", "TIANHE", "STATION", "CSS"]):
        return "station"
    if any(x in upper_name for x in ["DEB", "DEBRIS", "FRAG"]):
        return "debris"
    if any(x in upper_name for x in ["R/B", "ROCKET", "CENTAUR", "BLOCK"]):
        return "rocket-body"
    
    return "satellite"


def parse_tle_text(text: str) -> List[SatelliteData]:
    """Parse TLE text file format"""
    satellites = []
    lines = [line.strip() for line in text.strip().split('\n') if line.strip()]
    
    i = 0
    while i < len(lines) - 2:
        name = lines[i]
        line1 = lines[i + 1]
        line2 = lines[i + 2]
        
        # Validate TLE format
        if line1.startswith('1 ') and line2.startswith('2 '):
            parsed = parse_tle_line(line1, line2)
            
            if parsed:
                sat = SatelliteData(
                    norad_id=parsed["norad_id"],
                    name=name,
                    line1=line1,
                    line2=line2,
                    satellite_type=determine_satellite_type(name),
                    altitude=parsed.get("altitude"),
                    inclination=parsed.get("inclination"),
                    eccentricity=parsed.get("eccentricity"),
                    period=parsed.get("period"),
                )
                satellites.append(sat)
            
            i += 3
        else:
            i += 1
    
    return satellites


class DataFetcher:
    """Service for fetching TLE data from multiple sources"""
    
    def __init__(self):
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/plain, text/html, */*",
            "Accept-Language": "en-US,en;q=0.9",
            "Accept-Encoding": "gzip, deflate, br",
            "Connection": "keep-alive",
        }
    
    async def fetch_tle_url(self, url: str, timeout: float = 30.0) -> List[SatelliteData]:
        """Fetch TLE data from a specific URL with robust error handling"""
        try:
            # Create SSL context with certifi certificates
            ssl_context = ssl.create_default_context(cafile=certifi.where())
            
            async with httpx.AsyncClient(
                timeout=httpx.Timeout(timeout, connect=15.0),
                headers=self.headers,
                follow_redirects=True,
                verify=ssl_context,
                http2=True,  # Try HTTP/2 if available
            ) as client:
                response = await client.get(url)
                response.raise_for_status()
                
                return parse_tle_text(response.text)
        
        except httpx.TimeoutException as e:
            logger.warning(f"Timeout fetching {url}: {e}")
            return []
        except httpx.HTTPStatusError as e:
            logger.warning(f"HTTP error {e.response.status_code} fetching {url}")
            return []
        except Exception as e:
            logger.error(f"Failed to fetch TLE from {url}: {e}")
            return []
    
    async def fetch_all_tle_data(self):
        """Fetch TLE data from all sources with multiple fallbacks"""
        all_satellites = {}
        
        # Strategy 1: Try primary CelesTrak GP API sources
        logger.info("📡 Attempting primary CelesTrak sources...")
        for source in TLE_SOURCES_PRIMARY:
            logger.info(f"  Fetching {source['name']}...")
            satellites = await self.fetch_tle_url(source["url"], timeout=45.0)
            
            for sat in satellites:
                if sat.norad_id not in all_satellites:
                    all_satellites[sat.norad_id] = sat
            
            if satellites:
                logger.info(f"    ✓ Loaded {len(satellites)} satellites")
            else:
                logger.warning(f"    ✗ No data from {source['name']}")
        
        # Strategy 2: Try backup .txt sources if primary failed
        if len(all_satellites) < 100:
            logger.info("📡 Trying backup CelesTrak .txt sources...")
            for source in TLE_SOURCES_BACKUP:
                logger.info(f"  Fetching {source['name']}...")
                satellites = await self.fetch_tle_url(source["url"], timeout=45.0)
                
                for sat in satellites:
                    if sat.norad_id not in all_satellites:
                        all_satellites[sat.norad_id] = sat
                
                if satellites:
                    logger.info(f"    ✓ Loaded {len(satellites)} satellites")
        
        # Strategy 3: Use fallback sample data if all else fails
        if len(all_satellites) < 10:
            logger.warning("⚠️ All remote sources failed, using fallback sample data...")
            fallback_satellites = self.get_fallback_satellites()
            for sat in fallback_satellites:
                all_satellites[sat.norad_id] = sat
            logger.info(f"  Loaded {len(fallback_satellites)} fallback satellites")
        
        # Update cache
        cache.update_satellites(list(all_satellites.values()))
        
        logger.info(f"🛰️ Total satellites cached: {len(all_satellites)}")
        
        return len(all_satellites)
    
    def get_fallback_satellites(self) -> List[SatelliteData]:
        """Return comprehensive sample TLE data when APIs are unavailable"""
        sample_tles = [
            # === Space Stations ===
            ("ISS (ZARYA)", "1 25544U 98067A   24001.50000000  .00016717  00000-0  10270-3 0  9025", "2 25544  51.6400 208.9163 0006703 167.7423 192.4284 15.50000000    12"),
            ("CSS (TIANHE)", "1 48274U 21035A   24001.50000000  .00020000  00000-0  22000-3 0  9999", "2 48274  41.4700  50.0000 0005000 280.0000  80.0000 15.60000000    17"),
            
            # === Special Missions ===
            ("HST", "1 20580U 90037B   24001.50000000  .00000880  00000-0  00000+0 0  9999", "2 20580  28.4700  85.0000 0002700 100.0000 260.0000 15.09000000    17"),
            
            # === GPS Constellation (31 operational) ===
            ("GPS BIIR-2  (PRN 13)", "1 24876U 97035A   24001.50000000 -.00000020  00000-0  00000+0 0  9999", "2 24876  55.4000 150.0000 0100000  90.0000 270.0000  2.00550000    17"),
            ("GPS BIIR-3  (PRN 11)", "1 25933U 99055A   24001.50000000  .00000010  00000-0  00000+0 0  9999", "2 25933  51.9000 210.0000 0150000 120.0000 240.0000  2.00560000    17"),
            ("GPS BIIR-4  (PRN 20)", "1 26360U 00025A   24001.50000000 -.00000010  00000-0  00000+0 0  9999", "2 26360  53.0000  30.0000 0050000 200.0000 160.0000  2.00570000    17"),
            ("GPS BIIR-5  (PRN 28)", "1 26407U 00040A   24001.50000000  .00000005  00000-0  00000+0 0  9999", "2 26407  56.7000  90.0000 0080000  45.0000 315.0000  2.00580000    17"),
            ("GPS BIIF-1  (PRN 25)", "1 36585U 10022A   24001.50000000 -.00000005  00000-0  00000+0 0  9999", "2 36585  55.0000 270.0000 0120000 135.0000 225.0000  2.00590000    17"),
            ("GPS BIIF-2  (PRN 01)", "1 37753U 11036A   24001.50000000  .00000008  00000-0  00000+0 0  9999", "2 37753  55.2000  60.0000 0090000 180.0000 180.0000  2.00545000    17"),
            ("GPS BIIF-3  (PRN 24)", "1 38833U 12053A   24001.50000000 -.00000003  00000-0  00000+0 0  9999", "2 38833  54.8000 330.0000 0110000  75.0000 285.0000  2.00555000    17"),
            ("GPS III-1  (PRN 04)", "1 43873U 18109A   24001.50000000  .00000012  00000-0  00000+0 0  9999", "2 43873  55.1000 120.0000 0070000 250.0000 110.0000  2.00565000    17"),
            ("GPS III-2  (PRN 18)", "1 44506U 19056A   24001.50000000 -.00000007  00000-0  00000+0 0  9999", "2 44506  55.0000 180.0000 0080000 300.0000  60.0000  2.00575000    17"),
            ("GPS III-3  (PRN 23)", "1 45854U 20041A   24001.50000000  .00000006  00000-0  00000+0 0  9999", "2 45854  55.3000 240.0000 0065000  15.0000 345.0000  2.00585000    17"),
            
            # === GLONASS Constellation ===
            ("COSMOS 2459 (GLONASS)", "1 37867U 11064A   24001.50000000 -.00000010  00000-0  00000+0 0  9999", "2 37867  64.8000 100.0000 0010000 120.0000 240.0000  2.13000000    17"),
            ("COSMOS 2460 (GLONASS)", "1 37868U 11064B   24001.50000000  .00000005  00000-0  00000+0 0  9999", "2 37868  64.8000 101.0000 0012000 115.0000 245.0000  2.13000000    17"),
            ("COSMOS 2461 (GLONASS)", "1 37869U 11064C   24001.50000000 -.00000008  00000-0  00000+0 0  9999", "2 37869  64.8000 102.0000 0008000 110.0000 250.0000  2.13000000    17"),
            ("COSMOS 2514 (GLONASS)", "1 43508U 18053A   24001.50000000  .00000003  00000-0  00000+0 0  9999", "2 43508  64.9000 160.0000 0015000 200.0000 160.0000  2.13100000    17"),
            ("COSMOS 2545 (GLONASS)", "1 45358U 20018A   24001.50000000 -.00000006  00000-0  00000+0 0  9999", "2 45358  64.7000 220.0000 0009000 280.0000  80.0000  2.13050000    17"),
            
            # === Galileo Constellation ===
            ("GALILEO 201 (E18)", "1 40544U 15017A   24001.50000000  .00000002  00000-0  00000+0 0  9999", "2 40544  56.0000  45.0000 0003000 200.0000 160.0000  1.70000000    17"),
            ("GALILEO 202 (E14)", "1 40545U 15017B   24001.50000000  .00000001  00000-0  00000+0 0  9999", "2 40545  56.0000  46.0000 0004000 195.0000 165.0000  1.70000000    17"),
            ("GALILEO 203 (E26)", "1 40889U 15045A   24001.50000000 -.00000002  00000-0  00000+0 0  9999", "2 40889  55.8000 105.0000 0005000 250.0000 110.0000  1.70050000    17"),
            ("GALILEO 204 (E22)", "1 40890U 15045B   24001.50000000  .00000003  00000-0  00000+0 0  9999", "2 40890  55.9000 106.0000 0003500 240.0000 120.0000  1.70025000    17"),
            
            # === Iridium NEXT Constellation ===
            ("IRIDIUM 100", "1 41917U 17003A   24001.50000000  .00000080  00000-0  20000-4 0  9999", "2 41917  86.4000  60.0000 0002000  90.0000 270.0000 14.34000000    17"),
            ("IRIDIUM 102", "1 41918U 17003B   24001.50000000  .00000075  00000-0  18000-4 0  9999", "2 41918  86.4000  61.0000 0002200  85.0000 275.0000 14.34000000    17"),
            ("IRIDIUM 103", "1 41919U 17003C   24001.50000000  .00000085  00000-0  22000-4 0  9999", "2 41919  86.4000  62.0000 0001800  80.0000 280.0000 14.34000000    17"),
            ("IRIDIUM 104", "1 41920U 17003D   24001.50000000  .00000070  00000-0  16000-4 0  9999", "2 41920  86.4000  63.0000 0002400  75.0000 285.0000 14.34000000    17"),
            ("IRIDIUM 105", "1 41921U 17003E   24001.50000000  .00000090  00000-0  24000-4 0  9999", "2 41921  86.4000  64.0000 0001600  70.0000 290.0000 14.34000000    17"),
            ("IRIDIUM 106", "1 41922U 17003F   24001.50000000  .00000078  00000-0  19000-4 0  9999", "2 41922  86.4000  65.0000 0001900  65.0000 295.0000 14.34000000    17"),
            ("IRIDIUM 107", "1 41923U 17003G   24001.50000000  .00000082  00000-0  21000-4 0  9999", "2 41923  86.4000  66.0000 0002100  60.0000 300.0000 14.34000000    17"),
            ("IRIDIUM 108", "1 41924U 17003H   24001.50000000  .00000072  00000-0  17000-4 0  9999", "2 41924  86.4000  67.0000 0001700  55.0000 305.0000 14.34000000    17"),
            
            # === Starlink Samples (representative set across shells) ===
            ("STARLINK-1007", "1 44713U 19074A   24001.50000000  .00020000  00000-0  10000-3 0  9999", "2 44713  53.0000 120.0000 0001500  90.0000 270.0000 15.06000000    17"),
            ("STARLINK-1008", "1 44714U 19074B   24001.50000000  .00018000  00000-0  95000-4 0  9999", "2 44714  53.0000 121.0000 0001200  85.0000 275.0000 15.06000000    17"),
            ("STARLINK-1009", "1 44715U 19074C   24001.50000000  .00019000  00000-0  98000-4 0  9999", "2 44715  53.0000 122.0000 0001800  80.0000 280.0000 15.06000000    17"),
            ("STARLINK-1010", "1 44716U 19074D   24001.50000000  .00017000  00000-0  92000-4 0  9999", "2 44716  53.0000 123.0000 0001100  75.0000 285.0000 15.06000000    17"),
            ("STARLINK-1011", "1 44717U 19074E   24001.50000000  .00016000  00000-0  88000-4 0  9999", "2 44717  53.0000 124.0000 0001400  70.0000 290.0000 15.06000000    17"),
            ("STARLINK-1012", "1 44718U 19074F   24001.50000000  .00021000  00000-0  11000-3 0  9999", "2 44718  53.0000 125.0000 0001600  65.0000 295.0000 15.06000000    17"),
            ("STARLINK-1013", "1 44719U 19074G   24001.50000000  .00015000  00000-0  85000-4 0  9999", "2 44719  53.0000 126.0000 0001300  60.0000 300.0000 15.06000000    17"),
            ("STARLINK-1014", "1 44720U 19074H   24001.50000000  .00022000  00000-0  12000-3 0  9999", "2 44720  53.0000 127.0000 0001000  55.0000 305.0000 15.06000000    17"),
            ("STARLINK-1015", "1 44721U 19074J   24001.50000000  .00014000  00000-0  80000-4 0  9999", "2 44721  53.0000 128.0000 0001700  50.0000 310.0000 15.06000000    17"),
            ("STARLINK-1016", "1 44722U 19074K   24001.50000000  .00023000  00000-0  13000-3 0  9999", "2 44722  53.0000 129.0000 0001900  45.0000 315.0000 15.06000000    17"),
            ("STARLINK-2000", "1 47183U 20088A   24001.50000000  .00019500  00000-0  99000-4 0  9999", "2 47183  53.0000 200.0000 0001300 100.0000 260.0000 15.06000000    17"),
            ("STARLINK-2001", "1 47184U 20088B   24001.50000000  .00018500  00000-0  94000-4 0  9999", "2 47184  53.0000 201.0000 0001500  95.0000 265.0000 15.06000000    17"),
            ("STARLINK-3000", "1 50000U 21001A   24001.50000000  .00020500  00000-0  10500-3 0  9999", "2 50000  53.2000  50.0000 0001200 150.0000 210.0000 15.06000000    17"),
            ("STARLINK-3001", "1 50001U 21001B   24001.50000000  .00019800  00000-0  10100-3 0  9999", "2 50001  53.2000  51.0000 0001400 145.0000 215.0000 15.06000000    17"),
            
            # === OneWeb Samples ===
            ("ONEWEB-0012", "1 44057U 19010A   24001.50000000  .00000100  00000-0  10000-4 0  9999", "2 44057  87.9000 180.0000 0001500  45.0000 315.0000 13.15000000    17"),
            ("ONEWEB-0013", "1 44058U 19010B   24001.50000000  .00000095  00000-0  95000-5 0  9999", "2 44058  87.9000 181.0000 0001700  40.0000 320.0000 13.15000000    17"),
            ("ONEWEB-0014", "1 44059U 19010C   24001.50000000  .00000105  00000-0  11000-4 0  9999", "2 44059  87.9000 182.0000 0001300  35.0000 325.0000 13.15000000    17"),
            ("ONEWEB-0015", "1 44060U 19010D   24001.50000000  .00000088  00000-0  88000-5 0  9999", "2 44060  87.9000 183.0000 0001900  30.0000 330.0000 13.15000000    17"),
            ("ONEWEB-0100", "1 45132U 20008A   24001.50000000  .00000092  00000-0  92000-5 0  9999", "2 45132  87.9000 250.0000 0001400  70.0000 290.0000 13.15000000    17"),
            ("ONEWEB-0101", "1 45133U 20008B   24001.50000000  .00000098  00000-0  98000-5 0  9999", "2 45133  87.9000 251.0000 0001600  65.0000 295.0000 13.15000000    17"),
            
            # === Debris Samples ===
            ("COSMOS 2251 DEB", "1 34454U 93036PX  24001.50000000  .00002000  00000-0  10000-3 0  9999", "2 34454  74.0000 200.0000 0100000  60.0000 300.0000 14.50000000    17"),
            ("FENGYUN 1C DEB", "1 31141U 99025ANF 24001.50000000  .00001500  00000-0  80000-4 0  9999", "2 31141  99.0000 150.0000 0080000 100.0000 260.0000 14.20000000    17"),
            ("COSMOS 1408 DEB", "1 49127U 21109A   24001.50000000  .00003500  00000-0  18000-3 0  9999", "2 49127  82.5000  75.0000 0120000 130.0000 230.0000 14.90000000    17"),
            ("IRIDIUM 33 DEB", "1 33776U 09005A   24001.50000000  .00001800  00000-0  90000-4 0  9999", "2 33776  86.4000 300.0000 0050000  20.0000 340.0000 14.60000000    17"),
            
            # === Rocket Bodies ===
            ("CZ-2C R/B", "1 25732U 99025B   24001.50000000  .00003000  00000-0  15000-3 0  9999", "2 25732  97.5000  80.0000 0150000 150.0000 210.0000 14.80000000    17"),
            ("FALCON 9 R/B", "1 45678U 20020B   24001.50000000  .00005000  00000-0  25000-3 0  9999", "2 45678  53.0000 250.0000 0200000  20.0000 340.0000 15.20000000    17"),
            ("DELTA 4 R/B", "1 28626U 05017B   24001.50000000  .00000500  00000-0  25000-4 0  9999", "2 28626  28.5000 120.0000 7300000 270.0000  90.0000  2.50000000    17"),
            ("ARIANE 5 R/B", "1 37606U 11020B   24001.50000000  .00000300  00000-0  15000-4 0  9999", "2 37606   6.0000 340.0000 7100000 180.0000 180.0000  2.60000000    17"),
            
            # === Earth Observation ===
            ("LANDSAT 9", "1 49260U 21088A   24001.50000000  .00000200  00000-0  10000-4 0  9999", "2 49260  98.2000 100.0000 0001500 120.0000 240.0000 14.57000000    17"),
            ("SENTINEL-2A", "1 40697U 15028A   24001.50000000  .00000150  00000-0  75000-5 0  9999", "2 40697  98.5000 200.0000 0001200 150.0000 210.0000 14.31000000    17"),
            ("WORLDVIEW-3", "1 40115U 14048A   24001.50000000  .00000300  00000-0  15000-4 0  9999", "2 40115  97.9000 280.0000 0002000  60.0000 300.0000 15.19000000    17"),
            
            # === Weather Satellites ===
            ("GOES 16", "1 41866U 16071A   24001.50000000  .00000020  00000-0  00000+0 0  9999", "2 41866   0.0500 270.0000 0001500  90.0000 270.0000  1.00270000    17"),
            ("GOES 18", "1 51850U 22021A   24001.50000000  .00000015  00000-0  00000+0 0  9999", "2 51850   0.0300 220.0000 0001200 120.0000 240.0000  1.00270000    17"),
            ("NOAA 20", "1 43013U 17073A   24001.50000000  .00000180  00000-0  90000-5 0  9999", "2 43013  98.7000  50.0000 0001800 180.0000 180.0000 14.19000000    17"),
        ]
        
        satellites = []
        for name, line1, line2 in sample_tles:
            parsed = parse_tle_line(line1, line2)
            if parsed:
                sat = SatelliteData(
                    norad_id=parsed["norad_id"],
                    name=name,
                    line1=line1,
                    line2=line2,
                    satellite_type=determine_satellite_type(name),
                    altitude=parsed.get("altitude"),
                    inclination=parsed.get("inclination"),
                    eccentricity=parsed.get("eccentricity"),
                    period=parsed.get("period"),
                )
                satellites.append(sat)
        
        return satellites
