const HealthMonitor = require('../service/health-monitor')

describe('HealthMonitor Performance Tests', () => {
  let healthMonitor

  beforeEach(() => {
    healthMonitor = new HealthMonitor({})
  })

  test('should complete health check within reasonable time', async () => {
    const startTime = Date.now()
    
    const result = await healthMonitor.performHealthCheck()
    
    const endTime = Date.now()
    const duration = endTime - startTime
    
    // Should complete within 30 seconds under normal conditions
    expect(duration).toBeLessThan(30000)
    expect(result).toHaveProperty('timestamp')
    
    console.log(`Health check completed in ${duration}ms`)
  }, 35000)

  test('should handle concurrent health checks', async () => {
    const promises = []
    
    // Run 3 concurrent health checks
    for (let i = 0; i < 3; i++) {
      promises.push(healthMonitor.performHealthCheck())
    }
    
    const results = await Promise.all(promises)
    
    // All should complete successfully
    expect(results).toHaveLength(3)
    results.forEach(result => {
      expect(result).toHaveProperty('overall')
      expect(result).toHaveProperty('checks')
    })
  }, 45000)
})