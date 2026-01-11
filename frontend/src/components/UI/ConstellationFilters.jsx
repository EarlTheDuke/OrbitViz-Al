import { useStore } from '../../stores/useStore'
import { Satellite, Globe2, Navigation, Radio } from 'lucide-react'

/**
 * Constellation quick filters for major satellite groups
 */
export default function ConstellationFilters() {
  const { constellationFilters, toggleConstellation, satellites } = useStore()
  
  // Count satellites in each constellation
  const getCount = (constellation) => {
    return satellites.filter(sat => {
      const name = sat.name.toUpperCase()
      switch (constellation) {
        case 'starlink':
          return name.includes('STARLINK')
        case 'oneweb':
          return name.includes('ONEWEB')
        case 'gps':
          return name.includes('GPS') || name.includes('NAVSTAR')
        case 'glonass':
          return name.includes('GLONASS') || name.includes('COSMOS')
        case 'galileo':
          return name.includes('GALILEO')
        case 'iridium':
          return name.includes('IRIDIUM')
        default:
          return false
      }
    }).length
  }
  
  const constellations = [
    { 
      id: 'starlink', 
      name: 'Starlink', 
      icon: Satellite,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20',
      borderColor: 'border-blue-500/50',
    },
    { 
      id: 'oneweb', 
      name: 'OneWeb', 
      icon: Globe2,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/20',
      borderColor: 'border-purple-500/50',
    },
    { 
      id: 'gps', 
      name: 'GPS', 
      icon: Navigation,
      color: 'text-green-400',
      bgColor: 'bg-green-500/20',
      borderColor: 'border-green-500/50',
    },
    { 
      id: 'glonass', 
      name: 'GLONASS', 
      icon: Navigation,
      color: 'text-red-400',
      bgColor: 'bg-red-500/20',
      borderColor: 'border-red-500/50',
    },
    { 
      id: 'galileo', 
      name: 'Galileo', 
      icon: Navigation,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/20',
      borderColor: 'border-yellow-500/50',
    },
    { 
      id: 'iridium', 
      name: 'Iridium', 
      icon: Radio,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-500/20',
      borderColor: 'border-cyan-500/50',
    },
  ]
  
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-medium text-space-400 uppercase tracking-wider mb-2">
        Constellations
      </h4>
      
      <div className="grid grid-cols-2 gap-2">
        {constellations.map(({ id, name, icon: Icon, color, bgColor, borderColor }) => {
          const count = getCount(id)
          const isActive = constellationFilters[id]
          
          return (
            <button
              key={id}
              onClick={() => toggleConstellation(id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium
                transition-all border ${
                isActive
                  ? `${bgColor} ${color} ${borderColor}`
                  : 'bg-space-800/50 text-space-400 border-transparent hover:bg-space-700'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="flex-1 text-left">{name}</span>
              <span className={`text-[10px] ${isActive ? 'opacity-80' : 'opacity-50'}`}>
                {count.toLocaleString()}
              </span>
            </button>
          )
        })}
      </div>
      
      {/* Quick actions */}
      <div className="flex gap-2 mt-3">
        <button
          onClick={() => {
            Object.keys(constellationFilters).forEach(c => {
              if (!constellationFilters[c]) toggleConstellation(c)
            })
          }}
          className="flex-1 text-xs text-space-400 hover:text-white py-1.5 px-2 
            rounded bg-space-800/50 hover:bg-space-700 transition-colors"
        >
          Show All
        </button>
        <button
          onClick={() => {
            Object.keys(constellationFilters).forEach(c => {
              if (constellationFilters[c] && c !== 'other') toggleConstellation(c)
            })
          }}
          className="flex-1 text-xs text-space-400 hover:text-white py-1.5 px-2 
            rounded bg-space-800/50 hover:bg-space-700 transition-colors"
        >
          Hide Major
        </button>
      </div>
    </div>
  )
}
