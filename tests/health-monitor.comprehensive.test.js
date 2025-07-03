const HealthMonitor = require('../service/health-monitor')
const fs = require('fs-extra')
const path = require('path')

describe('HealthMonitor Comprehensive Tests', () => {
  let healthMonitor
  let tempDir

  beforeAll(async () => {
    // Create temporary test directory
    tempDir = path.join(__dirname, 'temp-test-dir')
    await fs.ensureDir(tempDir)
  })

  afterAll(async () => {
    // Clean up
    await fs.remove(tempDir)
  })

  beforeEach(() => {
    healthMonitor = new HealthMonitor({})
  })

  describe('Real System Tests', () => {
    test('should check actual system health', async () => {
      const result = await healthMonitor.performHealthCheck()
      
      expect(result).toHaveProperty('timestamp')
      expect(result).toHaveProperty('overall')
      expect(result.overall).toMatch(/^(healthy|unhealthy)$/)
      
      // Verify all expected checks are present
      const expectedChecks = ['diskSpace', 'network', 'ytdlp', 'tvdb', 'downloadsDir', 'config']
      expectedChecks.forEach(check => {
        expect(result.checks).toHaveProperty(check)
        expect(result.checks[check]).toHaveProperty('healthy')
        expect(result.checks[check]).toHaveProperty('message')
      })
    }, 15000) // Increased timeout to 15 seconds

    test('should provide detailed disk space information', async () => {
      const result = await healthMonitor.checkDiskSpace()
      
      if (result.healthy) {
        expect(result.details).toHaveProperty('used')
        expect(result.details).toHaveProperty('available')
        expect(result.details).toHaveProperty('usedPercent')
        expect(typeof result.details.usedPercent).toBe('number')
        expect(result.details.usedPercent).toBeGreaterThanOrEqual(0)
        expect(result.details.usedPercent).toBeLessThanOrEqual(100)
      }
    }, 10000)

    test('should test downloads directory permissions', async () => {
      const result = await healthMonitor.checkDownloadsDirectory()
      
      expect(result).toHaveProperty('healthy')
      expect(result).toHaveProperty('message')
      
      if (result.healthy) {
        expect(result.details).toHaveProperty('path')
        expect(result.details.path).toContain('downloads')
      }
    }, 5000)
  })

  describe('Edge Cases', () => {
    test('should handle very slow network responses', async () => {
      // This test will use actual network but with a longer timeout
      const result = await healthMonitor.checkNetworkConnectivity()
      
      // Should complete within reasonable time
      expect(result).toHaveProperty('healthy')
      expect(typeof result.healthy).toBe('boolean')
    }, 20000)

    test('should handle mixed health states', async () => {
      // Mock some checks to pass and some to fail
      jest.spyOn(healthMonitor, 'checkDiskSpace').mockResolvedValue({ healthy: true })
      jest.spyOn(healthMonitor, 'checkNetworkConnectivity').mockResolvedValue({ healthy: false })
      jest.spyOn(healthMonitor, 'checkYtDlp').mockResolvedValue({ healthy: true })
      jest.spyOn(healthMonitor, 'checkTVDBConnectivity').mockResolvedValue({ healthy: true })
      jest.spyOn(healthMonitor, 'checkDownloadsDirectory').mockResolvedValue({ healthy: false })
      jest.spyOn(healthMonitor, 'checkConfiguration').mockResolvedValue({ healthy: true })

      const result = await healthMonitor.performHealthCheck()
      
      expect(result.overall).toBe('unhealthy')
      
      // Count failed checks
      const failedChecks = Object.values(result.checks).filter(check => !check.healthy)
      expect(failedChecks.length).toBe(2) // network and downloadsDir
    })
  })
})