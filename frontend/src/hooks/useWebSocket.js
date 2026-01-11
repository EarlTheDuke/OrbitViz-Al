/**
 * WebSocket hook for real-time satellite position updates
 */

import { useEffect, useRef, useCallback, useState } from 'react'
import { useStore } from '../stores/useStore'

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws/positions'

// Reconnection settings
const RECONNECT_INTERVAL = 3000 // 3 seconds
const MAX_RECONNECT_ATTEMPTS = 10
const PING_INTERVAL = 30000 // 30 seconds

export function useWebSocket() {
  const wsRef = useRef(null)
  const reconnectAttemptsRef = useRef(0)
  const pingIntervalRef = useRef(null)
  const reconnectTimeoutRef = useRef(null)
  
  const [isConnected, setIsConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [error, setError] = useState(null)
  
  const {
    setWebSocketPositions,
    setWebSocketStatus,
    wsEnabled,
  } = useStore()

  // Send message to WebSocket
  const sendMessage = useCallback((message) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
    }
  }, [])

  // Handle incoming messages
  const handleMessage = useCallback((event) => {
    try {
      const data = JSON.parse(event.data)
      
      switch (data.type) {
        case 'connection':
          console.log('🛰️ WebSocket connected:', data)
          setIsConnected(true)
          setError(null)
          reconnectAttemptsRef.current = 0
          setWebSocketStatus({
            connected: true,
            satelliteCount: data.satellite_count,
            updateInterval: data.update_interval,
          })
          break
          
        case 'positions':
          // Update satellite positions in store
          setWebSocketPositions(data.satellites, data.timestamp)
          setLastUpdate(new Date(data.timestamp))
          break
          
        case 'pong':
          // Keep-alive response received
          break
          
        case 'ping':
          // Server ping, respond with pong
          sendMessage({ type: 'pong', timestamp: Date.now() })
          break
          
        case 'interval_updated':
          console.log('Update interval changed to:', data.interval)
          break
          
        case 'status':
          console.log('WebSocket status:', data)
          setWebSocketStatus({
            connected: true,
            connections: data.connections,
            satelliteCount: data.satellite_count,
            updateInterval: data.update_interval,
            isBroadcasting: data.is_broadcasting,
          })
          break
          
        default:
          console.log('Unknown WebSocket message type:', data.type)
      }
    } catch (err) {
      console.error('Failed to parse WebSocket message:', err)
    }
  }, [setWebSocketPositions, setWebSocketStatus, sendMessage])

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return // Already connected
    }

    try {
      console.log('🔌 Connecting to WebSocket:', WS_URL)
      wsRef.current = new WebSocket(WS_URL)

      wsRef.current.onopen = () => {
        console.log('✅ WebSocket connection established')
        setIsConnected(true)
        setError(null)
        reconnectAttemptsRef.current = 0
        
        // Start ping interval
        pingIntervalRef.current = setInterval(() => {
          sendMessage({ type: 'ping', timestamp: Date.now() })
        }, PING_INTERVAL)
      }

      wsRef.current.onmessage = handleMessage

      wsRef.current.onclose = (event) => {
        console.log('🔴 WebSocket connection closed:', event.code, event.reason)
        setIsConnected(false)
        setWebSocketStatus({ connected: false })
        
        // Clear ping interval
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current)
          pingIntervalRef.current = null
        }
        
        // Attempt reconnection
        if (wsEnabled && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current++
          console.log(`Attempting reconnect (${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})...`)
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, RECONNECT_INTERVAL)
        } else if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
          setError('Failed to connect after maximum attempts. Using client-side calculations.')
        }
      }

      wsRef.current.onerror = (event) => {
        console.error('❌ WebSocket error:', event)
        setError('WebSocket connection error')
      }

    } catch (err) {
      console.error('Failed to create WebSocket connection:', err)
      setError(err.message)
    }
  }, [wsEnabled, handleMessage, sendMessage, setWebSocketStatus])

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current)
      pingIntervalRef.current = null
    }
    
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    
    setIsConnected(false)
    setWebSocketStatus({ connected: false })
  }, [setWebSocketStatus])

  // Set update interval
  const setUpdateInterval = useCallback((interval) => {
    sendMessage({ type: 'set_interval', interval })
  }, [sendMessage])

  // Request status
  const requestStatus = useCallback(() => {
    sendMessage({ type: 'get_status' })
  }, [sendMessage])

  // Effect to manage connection based on wsEnabled
  useEffect(() => {
    if (wsEnabled) {
      connect()
    } else {
      disconnect()
    }
    
    return () => {
      disconnect()
    }
  }, [wsEnabled, connect, disconnect])

  return {
    isConnected,
    lastUpdate,
    error,
    connect,
    disconnect,
    setUpdateInterval,
    requestStatus,
    sendMessage,
  }
}

export default useWebSocket
