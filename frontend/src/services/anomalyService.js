/**
 * Anomaly Detection API Service
 * Communicates with the backend anomaly detection endpoints
 */

const API_BASE = 'http://localhost:8000/api/anomaly'

class AnomalyService {
  /**
   * Analyze a specific satellite for anomalies
   */
  async analyzeSatellite(noradId, hours = 24) {
    const response = await fetch(
      `${API_BASE}/analyze/${noradId}?hours=${hours}`
    )
    
    if (!response.ok) {
      throw new Error(`Failed to analyze satellite: ${response.statusText}`)
    }
    
    return response.json()
  }
  
  /**
   * Run batch anomaly analysis on multiple satellites
   */
  async batchAnalysis(sampleSize = 100, satelliteType = null) {
    let url = `${API_BASE}/batch?sample_size=${sampleSize}`
    
    if (satelliteType) {
      url += `&satellite_type=${satelliteType}`
    }
    
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`Batch analysis failed: ${response.statusText}`)
    }
    
    return response.json()
  }
  
  /**
   * Get list of anomaly types
   */
  async getAnomalyTypes() {
    const response = await fetch(`${API_BASE}/types`)
    
    if (!response.ok) {
      throw new Error(`Failed to get anomaly types: ${response.statusText}`)
    }
    
    return response.json()
  }
  
  /**
   * Get recent anomalies
   */
  async getRecentAnomalies(options = {}) {
    const { hours = 24, severity, anomalyType, limit = 50 } = options
    
    let url = `${API_BASE}/recent?hours=${hours}&limit=${limit}`
    
    if (severity) {
      url += `&severity=${severity}`
    }
    if (anomalyType) {
      url += `&anomaly_type=${anomalyType}`
    }
    
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`Failed to get recent anomalies: ${response.statusText}`)
    }
    
    return response.json()
  }
  
  /**
   * Get anomaly detection statistics
   */
  async getStatistics() {
    const response = await fetch(`${API_BASE}/statistics`)
    
    if (!response.ok) {
      throw new Error(`Failed to get statistics: ${response.statusText}`)
    }
    
    return response.json()
  }
  
  /**
   * Check if anomaly service is available
   */
  async healthCheck() {
    try {
      const response = await fetch('http://localhost:8000/health', {
        method: 'GET',
        timeout: 3000,
      })
      return response.ok
    } catch {
      return false
    }
  }
}

// Singleton export
export const anomalyService = new AnomalyService()
export default anomalyService
