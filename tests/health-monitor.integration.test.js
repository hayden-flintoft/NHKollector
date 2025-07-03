const HealthMonitor = require('../service/health-monitor')
const fs = require('fs-extra')
const path = require('path')

describe('HealthMonitor Integration Tests', () => {
  let healthMonitor

  beforeAll(async () => {
    // Set up test environment
    await fs.ensureDir(path.join(__dirname, '../config'))
    await fs.ensureDir(path.join(__dirname, '../downloads'))
    
    // Create a test shows.json
    await fs.writeJSON(path.join(__dirname, '../config/shows.json'), [
      {
        name: "Test Show",
        nhkUrl: "https://www3.nhk.or.jp/nhkworld/en/shows/test/",
        tvdbUrl: "https://thetvdb.com/series/test"
      }
    ])

    healthMonitor = new HealthMonitor({})
  })

  afterAll(async () => {
    // Clean up test files
    await fs.remove(path.join(__dirname, '../config/shows.json'))
  })

  test('should perform complete health check', async () => {
    const result = await healthMonitor.performHealthCheck()
    
    expect(result).toHaveProperty('timestamp')
    expect(result).toHaveProperty('overall')
    expect(result).toHaveProperty('checks')
    
    // Check that all expected checks are present
    expect(result.checks).toHaveProperty('diskSpace')
    expect(result.checks).toHaveProperty('network')
    expect(result.checks).toHaveProperty('ytdlp')
    expect(result.checks).toHaveProperty('tvdb')
    expect(result.checks).toHaveProperty('downloadsDir')
    expect(result.checks).toHaveProperty('config')
    
    console.log('Health Check Results:', JSON.stringify(result, null, 2))
  }, 30000) // 30 second timeout for network checks
})