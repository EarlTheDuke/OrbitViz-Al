import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Globe, ChevronDown, Check } from 'lucide-react'
import { useTranslation, LANGUAGES } from '../../services/i18n'

/**
 * Language Selector Dropdown
 */
export default function LanguageSelector({ compact = false }) {
  const { language, setLanguage, currentLanguage, languages } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  
  const handleSelect = (langCode) => {
    setLanguage(langCode)
    setIsOpen(false)
  }
  
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 bg-space-800 hover:bg-space-700 
          border border-space-600 rounded-lg transition-colors ${compact ? 'text-sm' : ''}`}
      >
        <Globe className={`${compact ? 'w-4 h-4' : 'w-5 h-5'} text-cyber-blue`} />
        <span className="text-space-200">{currentLanguage.flag} {currentLanguage.native}</span>
        <ChevronDown className={`w-4 h-4 text-space-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            
            {/* Dropdown */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full left-0 mt-2 w-56 bg-space-800 border border-space-600 
                rounded-lg shadow-xl z-50 overflow-hidden"
            >
              <div className="p-2 max-h-72 overflow-y-auto custom-scrollbar">
                {Object.entries(languages).map(([code, lang]) => (
                  <button
                    key={code}
                    onClick={() => handleSelect(code)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      code === language
                        ? 'bg-cyber-blue/20 text-cyber-blue'
                        : 'hover:bg-space-700 text-space-300'
                    }`}
                  >
                    <span className="text-lg">{lang.flag}</span>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium">{lang.native}</p>
                      <p className="text-xs text-space-500">{lang.name}</p>
                    </div>
                    {code === language && (
                      <Check className="w-4 h-4 text-cyber-blue" />
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

/**
 * Compact language button for TopBar
 */
export function LanguageButton() {
  const { currentLanguage, setLanguage, languages } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  
  // Get next language in rotation
  const langCodes = Object.keys(languages)
  const currentIndex = langCodes.indexOf(currentLanguage.name === 'English' ? 'en' : 
    Object.keys(languages).find(k => languages[k].name === currentLanguage.name) || 'en')
  
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 hover:bg-space-700 rounded-lg transition-colors text-space-500 hover:text-cyber-blue"
        title="Change Language"
      >
        <Globe className="w-4 h-4" />
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full right-0 mt-2 w-48 bg-space-800 border border-space-600 
                rounded-lg shadow-xl z-50 overflow-hidden"
            >
              <div className="p-1 max-h-64 overflow-y-auto">
                {Object.entries(languages).map(([code, lang]) => (
                  <button
                    key={code}
                    onClick={() => {
                      setLanguage(code)
                      setIsOpen(false)
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded hover:bg-space-700 
                      text-space-300 transition-colors"
                  >
                    <span>{lang.flag}</span>
                    <span>{lang.native}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
