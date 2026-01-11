import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Filter, 
  Satellite, 
  Trash2, 
  Rocket,
  Building2,
  ChevronDown,
  ChevronRight,
  CircleDot,
  Mountain,
  Globe2,
  Radio,
} from 'lucide-react'
import { useStore } from '../../stores/useStore'
import ConstellationFilters from './ConstellationFilters'

const SATELLITE_TYPES = [
  { id: 'all', label: 'All Objects', icon: Globe2 },
  { id: 'satellite', label: 'Satellites', icon: Satellite },
  { id: 'station', label: 'Space Stations', icon: Building2 },
  { id: 'debris', label: 'Debris', icon: Trash2 },
  { id: 'rocket-body', label: 'Rocket Bodies', icon: Rocket },
]

const ALTITUDE_PRESETS = [
  { label: 'LEO (< 2,000 km)', min: 0, max: 2000 },
  { label: 'MEO (2,000 - 35,786 km)', min: 2000, max: 35786 },
  { label: 'GEO (~35,786 km)', min: 35000, max: 36500 },
  { label: 'HEO (> 35,786 km)', min: 35786, max: 50000 },
  { label: 'All Altitudes', min: 0, max: 50000 },
]

export default function Sidebar() {
  const { 
    sidebarOpen, 
    filters, 
    setFilter, 
    filteredSatellites,
    stats,
    setSelectedSatellite,
  } = useStore()
  
  const [expandedSections, setExpandedSections] = useState({
    type: true,
    constellations: true,
    altitude: true,
    satellites: true,
  })
  
  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  if (!sidebarOpen) return null

  return (
    <motion.aside
      initial={{ x: -320, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -320, opacity: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="h-full w-80 glass-panel-strong border-r border-space-600/50 flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 border-b border-space-600/50">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-5 h-5 text-cyber-blue" />
          <h2 className="font-display font-semibold text-lg">Filters</h2>
        </div>
        <p className="text-sm text-space-500">
          Showing <span className="text-cyber-blue font-mono">{filteredSatellites.length.toLocaleString()}</span> of {stats.totalObjects.toLocaleString()} objects
        </p>
      </div>
      
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
        {/* Type Filter */}
        <FilterSection
          title="Object Type"
          isExpanded={expandedSections.type}
          onToggle={() => toggleSection('type')}
        >
          <div className="space-y-1">
            {SATELLITE_TYPES.map((type) => (
              <button
                key={type.id}
                onClick={() => setFilter('type', type.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                  filters.type === type.id
                    ? 'bg-cyber-blue/20 border border-cyber-blue/50 text-cyber-blue'
                    : 'hover:bg-space-700 text-space-400 hover:text-white'
                }`}
              >
                <type.icon className="w-4 h-4" />
                <span className="text-sm">{type.label}</span>
                <span className="ml-auto text-xs font-mono opacity-60">
                  {getCountForType(type.id, stats)}
                </span>
              </button>
            ))}
          </div>
        </FilterSection>
        
        {/* Constellation Filters */}
        <FilterSection
          title="Constellations"
          isExpanded={expandedSections.constellations}
          onToggle={() => toggleSection('constellations')}
          icon={Radio}
        >
          <ConstellationFilters />
        </FilterSection>
        
        {/* Altitude Filter */}
        <FilterSection
          title="Altitude Range"
          isExpanded={expandedSections.altitude}
          onToggle={() => toggleSection('altitude')}
          icon={Mountain}
        >
          <div className="space-y-3">
            {/* Preset buttons */}
            <div className="grid grid-cols-2 gap-2">
              {ALTITUDE_PRESETS.map((preset, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setFilter('minAltitude', preset.min)
                    setFilter('maxAltitude', preset.max)
                  }}
                  className={`px-2 py-1.5 text-xs rounded border transition-all ${
                    filters.minAltitude === preset.min && filters.maxAltitude === preset.max
                      ? 'bg-cyber-purple/20 border-cyber-purple/50 text-cyber-purple'
                      : 'border-space-600 hover:border-space-500 text-space-400'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            
            {/* Custom range */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <label className="text-xs text-space-500 mb-1 block">Min (km)</label>
                  <input
                    type="number"
                    value={filters.minAltitude}
                    onChange={(e) => setFilter('minAltitude', parseInt(e.target.value) || 0)}
                    className="input-cyber text-sm"
                    min={0}
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-space-500 mb-1 block">Max (km)</label>
                  <input
                    type="number"
                    value={filters.maxAltitude}
                    onChange={(e) => setFilter('maxAltitude', parseInt(e.target.value) || 50000)}
                    className="input-cyber text-sm"
                    max={50000}
                  />
                </div>
              </div>
            </div>
          </div>
        </FilterSection>
        
        {/* Satellite List */}
        <FilterSection
          title="Satellite List"
          isExpanded={expandedSections.satellites}
          onToggle={() => toggleSection('satellites')}
          icon={Satellite}
          badge={filteredSatellites.length}
        >
          <div className="space-y-1 max-h-64 overflow-y-auto custom-scrollbar">
            {filteredSatellites.slice(0, 50).map((sat) => (
              <SatelliteListItem 
                key={sat.noradId} 
                satellite={sat}
                onClick={() => setSelectedSatellite(sat)}
              />
            ))}
            {filteredSatellites.length > 50 && (
              <p className="text-xs text-space-500 text-center py-2">
                +{filteredSatellites.length - 50} more satellites
              </p>
            )}
            {filteredSatellites.length === 0 && (
              <p className="text-sm text-space-500 text-center py-4">
                No satellites match your filters
              </p>
            )}
          </div>
        </FilterSection>
      </div>
      
      {/* Footer */}
      <div className="p-4 border-t border-space-600/50">
        <div className="text-xs text-space-500 space-y-1">
          <p>Data source: CelesTrak.org</p>
          <p className="flex items-center gap-1">
            <CircleDot className="w-3 h-3 text-cyber-green" />
            Real-time tracking active
          </p>
        </div>
      </div>
    </motion.aside>
  )
}

// Collapsible filter section
function FilterSection({ title, icon: Icon, isExpanded, onToggle, badge, children }) {
  return (
    <div className="border border-space-600/50 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-2.5 bg-space-800/50 hover:bg-space-700/50 transition-colors"
      >
        {Icon && <Icon className="w-4 h-4 text-cyber-blue" />}
        <span className="text-sm font-medium flex-1 text-left">{title}</span>
        {badge !== undefined && (
          <span className="text-xs font-mono text-cyber-blue">{badge}</span>
        )}
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-space-500" />
        ) : (
          <ChevronRight className="w-4 h-4 text-space-500" />
        )}
      </button>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-3 bg-space-900/50">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Single satellite list item
function SatelliteListItem({ satellite, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-space-700/50 transition-colors text-left group"
    >
      <div 
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: satellite.color }}
      />
      <span className="text-xs truncate flex-1 text-space-400 group-hover:text-white">
        {satellite.name}
      </span>
      <span className="text-[10px] font-mono text-space-600 group-hover:text-space-400">
        {satellite.noradId}
      </span>
    </button>
  )
}

// Helper to get count for type
function getCountForType(type, stats) {
  switch (type) {
    case 'all': return stats.totalObjects
    case 'satellite': return stats.activeSatellites
    case 'debris': return stats.debris
    case 'rocket-body': return stats.rocketBodies
    case 'station': return stats.stations
    default: return 0
  }
}
