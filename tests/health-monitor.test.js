const HealthMonitor = require('../service/health-monitor')
const fs = require('fs-extra')
const path = require('path')
const axios = require('axios')

// Mock axios for testing
jest.mock('axios')
const mockedAxios = axios

describe('HealthMonitor', () => {
  let healthMonitor
  let mockNHKService

  beforeEach(() => {
    mockNHKService = {
      config: { downloadsPath: './downloads' }
    }
    healthMonitor = new HealthMonitor(mockNHKService)
  })

  describe('checkNetworkConnectivity', () => {
    test('should return healthy when NHK World is accessible', async () => {
      mockedAxios.get.mockResolvedValue({
        status: 200,
        headers: { 'x-response-time': '100ms' }
      })

      const result = await healthMonitor.checkNetworkConnectivity()
      
      expect(result.healthy).toBe(true)
      expect(result.message).toBe('NHK World accessible')
      expect(result.details.status).toBe(200)
    })

    test('should return unhealthy when network fails', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network error'))

      const result = await healthMonitor.checkNetworkConnectivity()
      
      expect(result.healthy).toBe(false)
      expect(result.message).toContain('Network connectivity failed')
    })
  })

  describe('checkDownloadsDirectory', () => {
    test('should create directory if it doesn\'t exist', async () => {
      const testDir = path.join(__dirname, 'temp-downloads')
      
      // Ensure directory doesn't exist
      await fs.remove(testDir)
      
      const result = await healthMonitor.checkDownloadsDirectory()
      
      expect(result.healthy).toBe(true)
      expect(result.message).toContain('accessible and writable')
    })
  })

  describe('performHealthCheck', () => {
    test('should return overall healthy status when all checks pass', async () => {
      // Mock all checks to pass
      jest.spyOn(healthMonitor, 'checkDiskSpace').mockResolvedValue({ healthy: true })
      jest.spyOn(healthMonitor, 'checkNetworkConnectivity').mockResolvedValue({ healthy: true })
      jest.spyOn(healthMonitor, 'checkYtDlp').mockResolvedValue({ healthy: true })
      jest.spyOn(healthMonitor, 'checkTVDBConnectivity').mockResolvedValue({ healthy: true })
      jest.spyOn(healthMonitor, 'checkDownloadsDirectory').mockResolvedValue({ healthy: true })
      jest.spyOn(healthMonitor, 'checkConfiguration').mockResolvedValue({ healthy: true })

      const result = await healthMonitor.performHealthCheck()
      
      expect(result.overall).toBe('healthy')
      expect(Object.keys(result.checks)).toHaveLength(6)
    })

    test('should return unhealthy when any check fails', async () => {
      // Mock one check to fail
      jest.spyOn(healthMonitor, 'checkDiskSpace').mockResolvedValue({ healthy: false })
      jest.spyOn(healthMonitor, 'checkNetworkConnectivity').mockResolvedValue({ healthy: true })

      const result = await healthMonitor.performHealthCheck()
      
      expect(result.overall).toBe('unhealthy')
    })
  })
})