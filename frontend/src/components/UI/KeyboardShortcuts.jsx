import { useState } from 'react'
import { Keyboard, X } from 'lucide-react'

/**
 * Keyboard shortcuts help modal
 */
export function KeyboardShortcutsModal({ isOpen, onClose }) {
  if (!isOpen) return null
  
  const shortcuts = [
    { key: 'Space', action: 'Pause / Resume simulation' },
    { key: '+  /  -', action: 'Increase / Decrease speed' },
    { key: '1 - 9', action: 'Speed presets (0.1x to 100x)' },
    { key: 'F', action: 'Toggle fullscreen' },
    { key: 'O', action: 'Toggle orbital paths' },
    { key: 'L', action: 'Toggle labels' },
    { key: 'T', action: 'Toggle day/night terminator' },
    { key: 'R', action: 'Reset to real-time' },
    { key: 'Esc', action: 'Clear selection / Exit fullscreen' },
  ]
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-space-900 border border-space-700 rounded-xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-accent-400" />
            Keyboard Shortcuts
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-space-700 rounded transition-colors"
          >
            <X className="w-5 h-5 text-space-400" />
          </button>
        </div>
        
        <div className="space-y-2">
          {shortcuts.map(({ key, action }) => (
            <div key={key} className="flex items-center justify-between py-2 border-b border-space-800">
              <kbd className="px-2 py-1 bg-space-800 border border-space-600 rounded text-sm 
                font-mono text-accent-400 min-w-[80px] text-center">
                {key}
              </kbd>
              <span className="text-space-300 text-sm">{action}</span>
            </div>
          ))}
        </div>
        
        <div className="mt-4 text-xs text-space-500">
          💡 Tip: Press <kbd className="px-1.5 py-0.5 bg-space-800 rounded font-mono">?</kbd> to toggle this help
        </div>
      </div>
    </div>
  )
}

/**
 * Button to show keyboard shortcuts
 */
export function KeyboardShortcutsButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="p-2 rounded-lg bg-space-800/50 text-space-400 hover:bg-space-700 
        hover:text-white transition-all border border-transparent"
      title="Keyboard Shortcuts"
    >
      <Keyboard className="w-5 h-5" />
    </button>
  )
}
