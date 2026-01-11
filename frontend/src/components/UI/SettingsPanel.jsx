import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Settings, 
  X, 
  Eye, 
  Palette,
  Globe2,
  Sparkles,
  Monitor,
  Download,
  Info,
  Languages,
} from 'lucide-react'
import { useStore } from '../../stores/useStore'
import LanguageSelector from './LanguageSelector'
import { useTranslation } from '../../services/i18n'

export default function SettingsPanel({ isOpen, onClose }) {
  const {
    showOrbits,
    toggleOrbits,
    showLabels,
    toggleLabels,
    animationSpeed,
    setAnimationSpeed,
  } = useStore()
  
  const [settings, setSettings] = useState({
    showAtmosphere: true,
    showGrid: true,
    showStars: true,
    satelliteSize: 1,
    orbitOpacity: 0.5,
    earthRotation: true,
    highPerformance: false,
  })
  
  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

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
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-96 glass-panel-strong border-l border-space-600/50 z-50 flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b border-space-600/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-cyber-blue" />
                <h2 className="font-display font-semibold text-lg">Settings</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-space-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">
              {/* Visualization Settings */}
              <SettingsSection title="Visualization" icon={Eye}>
                <ToggleSetting
                  label="Show Orbital Paths"
                  description="Display orbit trajectories for selected satellites"
                  checked={showOrbits}
                  onChange={toggleOrbits}
                />
                <ToggleSetting
                  label="Show Labels"
                  description="Display satellite names on the globe"
                  checked={showLabels}
                  onChange={toggleLabels}
                />
                <ToggleSetting
                  label="Show Atmosphere"
                  description="Display Earth's atmospheric glow"
                  checked={settings.showAtmosphere}
                  onChange={(v) => updateSetting('showAtmosphere', v)}
                />
                <ToggleSetting
                  label="Show Grid Lines"
                  description="Display latitude/longitude grid"
                  checked={settings.showGrid}
                  onChange={(v) => updateSetting('showGrid', v)}
                />
                <ToggleSetting
                  label="Show Stars"
                  description="Display background star field"
                  checked={settings.showStars}
                  onChange={(v) => updateSetting('showStars', v)}
                />
              </SettingsSection>
              
              {/* Globe Settings */}
              <SettingsSection title="Globe" icon={Globe2}>
                <ToggleSetting
                  label="Earth Rotation"
                  description="Animate Earth's rotation"
                  checked={settings.earthRotation}
                  onChange={(v) => updateSetting('earthRotation', v)}
                />
                <SliderSetting
                  label="Satellite Size"
                  value={settings.satelliteSize}
                  min={0.5}
                  max={3}
                  step={0.1}
                  onChange={(v) => updateSetting('satelliteSize', v)}
                />
                <SliderSetting
                  label="Orbit Opacity"
                  value={settings.orbitOpacity}
                  min={0.1}
                  max={1}
                  step={0.1}
                  onChange={(v) => updateSetting('orbitOpacity', v)}
                />
              </SettingsSection>
              
              {/* Performance Settings */}
              <SettingsSection title="Performance" icon={Monitor}>
                <ToggleSetting
                  label="High Performance Mode"
                  description="Reduce visual effects for better FPS"
                  checked={settings.highPerformance}
                  onChange={(v) => updateSetting('highPerformance', v)}
                />
                <div className="text-xs text-space-500 mt-2">
                  Current: Rendering ~14,000 objects
                </div>
              </SettingsSection>
              
              {/* Language Settings */}
              <SettingsSection title="Language" icon={Languages}>
                <div className="space-y-2">
                  <p className="text-sm text-space-400">Select your preferred language</p>
                  <LanguageSelector />
                </div>
              </SettingsSection>
              
              {/* Theme Settings */}
              <SettingsSection title="Appearance" icon={Palette}>
                <div className="grid grid-cols-4 gap-2">
                  {['cyber', 'midnight', 'aurora', 'sunset'].map((theme) => (
                    <button
                      key={theme}
                      className={`p-3 rounded-lg border transition-all ${
                        theme === 'cyber'
                          ? 'border-cyber-blue bg-cyber-blue/10'
                          : 'border-space-600 hover:border-space-500'
                      }`}
                    >
                      <div className={`w-full h-4 rounded ${
                        theme === 'cyber' ? 'bg-gradient-to-r from-cyber-blue to-cyber-purple' :
                        theme === 'midnight' ? 'bg-gradient-to-r from-blue-900 to-purple-900' :
                        theme === 'aurora' ? 'bg-gradient-to-r from-green-500 to-cyan-500' :
                        'bg-gradient-to-r from-orange-500 to-pink-500'
                      }`} />
                      <span className="text-[10px] text-space-500 mt-1 block capitalize">{theme}</span>
                    </button>
                  ))}
                </div>
              </SettingsSection>
              
              {/* About */}
              <SettingsSection title="About" icon={Info}>
                <div className="text-sm text-space-400 space-y-2">
                  <p><strong className="text-white">OrbitViz AI</strong> v1.0.0</p>
                  <p>Real-time satellite tracking with AI predictions</p>
                  <p className="text-xs text-space-500">
                    Data source: CelesTrak.org<br />
                    Orbital mechanics: satellite.js
                  </p>
                </div>
              </SettingsSection>
            </div>
            
            {/* Footer */}
            <div className="p-4 border-t border-space-600/50">
              <button className="btn-cyber-primary w-full flex items-center justify-center gap-2">
                <Download className="w-4 h-4" />
                Export Settings
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// Settings Section Component
function SettingsSection({ title, icon: Icon, children }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-cyber-blue" />
        <h3 className="font-semibold text-sm">{title}</h3>
      </div>
      <div className="space-y-3 pl-6">
        {children}
      </div>
    </div>
  )
}

// Toggle Setting Component
function ToggleSetting({ label, description, checked, onChange }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm">{label}</p>
        {description && (
          <p className="text-xs text-space-500">{description}</p>
        )}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors ${
          checked ? 'bg-cyber-blue' : 'bg-space-600'
        }`}
      >
        <span
          className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
            checked ? 'left-6' : 'left-1'
          }`}
        />
      </button>
    </div>
  )
}

// Slider Setting Component
function SliderSetting({ label, value, min, max, step, onChange }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm">{label}</span>
        <span className="text-xs font-mono text-cyber-blue">{value.toFixed(1)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-space-700 rounded-lg appearance-none cursor-pointer
                   [&::-webkit-slider-thumb]:appearance-none
                   [&::-webkit-slider-thumb]:w-4
                   [&::-webkit-slider-thumb]:h-4
                   [&::-webkit-slider-thumb]:rounded-full
                   [&::-webkit-slider-thumb]:bg-cyber-blue
                   [&::-webkit-slider-thumb]:cursor-pointer"
      />
    </div>
  )
}
