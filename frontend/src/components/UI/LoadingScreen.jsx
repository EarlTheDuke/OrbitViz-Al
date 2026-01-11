import { motion } from 'framer-motion'
import { Satellite } from 'lucide-react'

export default function LoadingScreen({ message, progress }) {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 z-[100] bg-space-900 flex flex-col items-center justify-center"
    >
      {/* Background grid */}
      <div className="absolute inset-0 grid-overlay opacity-20" />
      
      {/* Animated rings */}
      <div className="relative mb-12">
        {/* Outer ring */}
        <motion.div
          className="absolute inset-0 w-40 h-40 border-2 border-cyber-blue/20 rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        />
        
        {/* Middle ring */}
        <motion.div
          className="absolute inset-4 w-32 h-32 border-2 border-cyber-purple/30 rounded-full"
          animate={{ rotate: -360 }}
          transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
        />
        
        {/* Inner ring */}
        <motion.div
          className="absolute inset-8 w-24 h-24 border-2 border-cyber-blue/40 rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
        />
        
        {/* Satellite icon */}
        <motion.div
          className="w-40 h-40 flex items-center justify-center"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Satellite className="w-16 h-16 text-cyber-blue" />
        </motion.div>
        
        {/* Orbiting dots */}
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="absolute top-1/2 left-1/2 w-3 h-3"
            animate={{ rotate: 360 }}
            transition={{ 
              duration: 3 + i, 
              repeat: Infinity, 
              ease: 'linear',
              delay: i * 0.5 
            }}
            style={{ transformOrigin: `-${60 + i * 15}px 0` }}
          >
            <div 
              className="w-3 h-3 rounded-full"
              style={{ 
                backgroundColor: ['#00d4ff', '#8b5cf6', '#10b981'][i],
                boxShadow: `0 0 10px ${['#00d4ff', '#8b5cf6', '#10b981'][i]}`
              }}
            />
          </motion.div>
        ))}
      </div>
      
      {/* Logo */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="font-display font-bold text-4xl tracking-wider text-gradient mb-4"
      >
        OrbitViz AI
      </motion.h1>
      
      {/* Loading message */}
      <motion.p
        key={message}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="font-mono text-sm text-space-400 mb-8"
      >
        {message}
      </motion.p>
      
      {/* Progress bar */}
      <div className="w-80 h-1 bg-space-800 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-cyber-blue via-cyber-purple to-cyber-blue rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
      
      {/* Progress percentage */}
      <motion.p
        className="font-mono text-xs text-cyber-blue mt-3"
        key={progress}
        initial={{ opacity: 0.5 }}
        animate={{ opacity: 1 }}
      >
        {Math.round(progress)}%
      </motion.p>
      
      {/* System messages */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="flex items-center gap-3 text-xs font-mono text-space-600"
        >
          <span className="w-2 h-2 bg-cyber-green rounded-full animate-pulse" />
          <span>Systems initializing</span>
          <span className="text-space-700">|</span>
          <span>Real-time tracking enabled</span>
          <span className="text-space-700">|</span>
          <span>AI predictions ready</span>
        </motion.div>
      </div>
    </motion.div>
  )
}
