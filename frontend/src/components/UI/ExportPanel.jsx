import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Download, 
  X, 
  FileText,
  FileJson,
  Table,
  CheckCircle,
  Loader2,
} from 'lucide-react'
import { useStore } from '../../stores/useStore'

export default function ExportPanel({ isOpen, onClose }) {
  const { filteredSatellites, selectedSatellite, simulationTime } = useStore()
  const [exportFormat, setExportFormat] = useState('csv')
  const [exportScope, setExportScope] = useState('filtered')
  const [isExporting, setIsExporting] = useState(false)
  const [exportSuccess, setExportSuccess] = useState(false)
  
  const handleExport = async () => {
    setIsExporting(true)
    
    // Determine which satellites to export
    let satellitesToExport = []
    if (exportScope === 'selected' && selectedSatellite) {
      satellitesToExport = [selectedSatellite]
    } else if (exportScope === 'filtered') {
      satellitesToExport = filteredSatellites
    } else {
      satellitesToExport = filteredSatellites
    }
    
    // Generate export data
    const data = satellitesToExport.map(sat => ({
      name: sat.name,
      noradId: sat.noradId,
      type: sat.type,
      altitude: sat.altitude,
      velocity: sat.velocity,
      inclination: sat.inclination,
      eccentricity: sat.eccentricity,
      period: sat.period,
      latitude: sat.latitude || '',
      longitude: sat.longitude || '',
      intlDesignator: sat.intlDesignator || '',
      line1: sat.line1,
      line2: sat.line2,
      timestamp: simulationTime.toISOString(),
    }))
    
    let content, filename, mimeType
    
    if (exportFormat === 'csv') {
      content = generateCSV(data)
      filename = `orbitviz-export-${Date.now()}.csv`
      mimeType = 'text/csv'
    } else if (exportFormat === 'json') {
      content = JSON.stringify(data, null, 2)
      filename = `orbitviz-export-${Date.now()}.json`
      mimeType = 'application/json'
    } else {
      // TLE format
      content = data.map(sat => `${sat.name}\n${sat.line1}\n${sat.line2}`).join('\n\n')
      filename = `orbitviz-export-${Date.now()}.tle`
      mimeType = 'text/plain'
    }
    
    // Create and download file
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    setIsExporting(false)
    setExportSuccess(true)
    setTimeout(() => setExportSuccess(false), 3000)
  }
  
  const generateCSV = (data) => {
    if (data.length === 0) return ''
    
    const headers = Object.keys(data[0])
    const rows = data.map(row => 
      headers.map(header => {
        const value = row[header]
        // Escape quotes and wrap in quotes if contains comma
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`
        }
        return value
      }).join(',')
    )
    
    return [headers.join(','), ...rows].join('\n')
  }
  
  const exportOptions = [
    { id: 'csv', label: 'CSV', icon: Table, description: 'Spreadsheet format' },
    { id: 'json', label: 'JSON', icon: FileJson, description: 'Structured data' },
    { id: 'tle', label: 'TLE', icon: FileText, description: 'Two-Line Element' },
  ]
  
  const scopeOptions = [
    { id: 'filtered', label: 'Filtered Results', count: filteredSatellites.length },
    { id: 'selected', label: 'Selected Only', count: selectedSatellite ? 1 : 0, disabled: !selectedSatellite },
  ]

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          />
          
          {/* Panel */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 
                       w-[480px] glass-panel-strong rounded-xl z-50"
          >
            {/* Header */}
            <div className="p-4 border-b border-space-600/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Download className="w-5 h-5 text-cyber-blue" />
                <h2 className="font-display font-semibold text-lg">Export Data</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-space-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Format Selection */}
              <div>
                <label className="text-sm font-medium text-space-400 mb-3 block">
                  Export Format
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {exportOptions.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => setExportFormat(option.id)}
                      className={`p-4 rounded-lg border transition-all text-center ${
                        exportFormat === option.id
                          ? 'border-cyber-blue bg-cyber-blue/10 text-cyber-blue'
                          : 'border-space-600 hover:border-space-500'
                      }`}
                    >
                      <option.icon className="w-6 h-6 mx-auto mb-2" />
                      <span className="font-semibold text-sm block">{option.label}</span>
                      <span className="text-xs text-space-500">{option.description}</span>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Scope Selection */}
              <div>
                <label className="text-sm font-medium text-space-400 mb-3 block">
                  Export Scope
                </label>
                <div className="space-y-2">
                  {scopeOptions.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => !option.disabled && setExportScope(option.id)}
                      disabled={option.disabled}
                      className={`w-full p-3 rounded-lg border transition-all flex items-center justify-between ${
                        option.disabled 
                          ? 'border-space-700 opacity-50 cursor-not-allowed'
                          : exportScope === option.id
                            ? 'border-cyber-purple bg-cyber-purple/10'
                            : 'border-space-600 hover:border-space-500'
                      }`}
                    >
                      <span className="text-sm">{option.label}</span>
                      <span className="text-xs font-mono text-space-500">
                        {option.count.toLocaleString()} objects
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Preview */}
              <div className="glass-panel p-4 rounded-lg">
                <h4 className="text-xs font-mono text-space-500 mb-2">EXPORT PREVIEW</h4>
                <div className="text-sm space-y-1">
                  <p>
                    <span className="text-space-500">Format:</span>{' '}
                    <span className="text-cyber-blue">{exportFormat.toUpperCase()}</span>
                  </p>
                  <p>
                    <span className="text-space-500">Objects:</span>{' '}
                    <span className="text-cyber-purple">
                      {exportScope === 'selected' ? (selectedSatellite ? 1 : 0) : filteredSatellites.length}
                    </span>
                  </p>
                  <p>
                    <span className="text-space-500">Timestamp:</span>{' '}
                    <span className="text-space-400">{simulationTime.toISOString()}</span>
                  </p>
                </div>
              </div>
            </div>
            
            {/* Footer */}
            <div className="p-4 border-t border-space-600/50 flex gap-3">
              <button
                onClick={onClose}
                className="btn-cyber flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleExport}
                disabled={isExporting}
                className="btn-cyber-primary flex-1 flex items-center justify-center gap-2"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Exporting...
                  </>
                ) : exportSuccess ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Exported!
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Export
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
