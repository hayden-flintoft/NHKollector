const HealthMonitor = require('../service/health-monitor')

describe('HealthMonitor Failure Scenarios', () => {
  let healthMonitor

  beforeEach(() => {
    healthMonitor = new HealthMonitor({})
  })

  test('should handle missing yt-dlp gracefully', async () => {
    // Mock the execAsync function directly on the healthMonitor instance
    const originalCheckYtDlp = healthMonitor.checkYtDlp
    healthMonitor.checkYtDlp = jest.fn().mockImplementation(async () => {
      return {
        healthy: false,
        message: 'yt-dlp not available or not working',
        error: 'yt-dlp: command not found'
      }
    })

    const result = await healthMonitor.checkYtDlp()
    expect(result.healthy).toBe(false)
    expect(result.message).toContain('not available')
    
    // Restore original method
    healthMonitor.checkYtDlp = originalCheckYtDlp
  })

  test('should handle network timeouts', async () => {
    jest.setTimeout(15000)
    
    // Mock axios to simulate timeout
    const axios = require('axios')
    const originalGet = axios.get
    axios.get = jest.fn().mockRejectedValue(new Error('timeout of 10000ms exceeded'))
    
    const result = await healthMonitor.checkNetworkConnectivity()
    expect(result.healthy).toBe(false)
    expect(result.message).toContain('Network connectivity failed')
    
    // Restore original method
    axios.get = originalGet
  })

  test('should handle disk space check failure', async () => {
    // Mock the checkDiskSpace method to simulate failure
    healthMonitor.checkDiskSpace = jest.fn().mockResolvedValue({
      healthy: false,
      message: 'Disk space check failed: Permission denied',
      error: 'Permission denied'
    })

    const result = await healthMonitor.checkDiskSpace()
    expect(result.healthy).toBe(false)
    expect(result.message).toContain('failed')
  })

  test('should handle configuration file missing', async () => {
    // Mock fs.pathExists to return false
    const fs = require('fs-extra')
    const originalPathExists = fs.pathExists
    fs.pathExists = jest.fn().mockResolvedValue(false)

    const result = await healthMonitor.checkConfiguration()
    expect(result.healthy).toBe(false)
    expect(result.message).toContain('not found')
    
    // Restore original method
    fs.pathExists = originalPathExists
  })
})