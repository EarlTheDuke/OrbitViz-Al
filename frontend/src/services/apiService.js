/**
 * API Service for connecting to OrbitViz AI Backend
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

class ApiService {
  constructor() {
    this.baseUrl = API_BASE_URL
  }

  async fetch(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.detail || `HTTP ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error(`API Error: ${endpoint}`, error)
      throw error
    }
  }

  // Health check
  async healthCheck() {
    return this.fetch('/health')
  }

  // Satellites
  async getSatellites(params = {}) {
    const queryParams = new URLSearchParams(params).toString()
    return this.fetch(`/api/satellites?${queryParams}`)
  }

  async searchSatellites(query, limit = 50) {
    return this.fetch(`/api/satellites/search?q=${encodeURIComponent(query)}&limit=${limit}`)
  }

  async getSatellite(noradId) {
    return this.fetch(`/api/satellites/${noradId}`)
  }

  async getSatelliteStats() {
    return this.fetch('/api/satellites/stats/summary')
  }

  // Get ALL TLE data for visualization (bulk endpoint)
  async getAllTLE() {
    return this.fetch('/api/satellites/tle/all')
  }

  // Get TLE data organized by category for chunked loading
  async getTLEByCategory() {
    return this.fetch('/api/satellites/tle/categories')
  }

  // Predictions
  async getOrbitPrediction(noradId, hours = 2, points = 100) {
    return this.fetch(`/api/predictions/orbit/${noradId}?hours=${hours}&points=${points}`)
  }

  async getCurrentPosition(noradId) {
    return this.fetch(`/api/predictions/position/${noradId}`)
  }

  async getSatellitePasses(noradId, lat, lon, hours = 24) {
    return this.fetch(
      `/api/predictions/passes/${noradId}?lat=${lat}&lon=${lon}&hours=${hours}`
    )
  }

  // Analysis
  async analyzeConjunctions(noradId, hours = 24, thresholdKm = 25) {
    return this.fetch(
      `/api/analysis/conjunctions/${noradId}?hours=${hours}&threshold_km=${thresholdKm}`
    )
  }

  async predictReentry(noradId) {
    return this.fetch(`/api/analysis/reentry/${noradId}`)
  }

  async getDebrisDensity(minAlt = 200, maxAlt = 2000) {
    return this.fetch(`/api/analysis/debris-density?altitude_min=${minAlt}&altitude_max=${maxAlt}`)
  }

  // Data refresh
  async refreshData() {
    return this.fetch('/api/refresh', { method: 'POST' })
  }
}

export const apiService = new ApiService()
export default apiService
