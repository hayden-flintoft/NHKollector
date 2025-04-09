const Config = require('../../src/utils/config')
const fs = require('fs-extra')
const path = require('path')
const assert = require('assert')

describe('Config', () => {
  beforeEach(async () => {
    // Setup test config
    const testConfig = { test: { key: 'value' } }
    await fs.writeJson(path.join(Config.configDir, 'test.json'), testConfig)
    await Config.load()
  })

  it('should load config files', async () => {
    const value = Config.get('test.key')
    assert.equal(value, 'value')
  })

  it('should prioritize environment variables', async () => {
    process.env.TEST_KEY = 'env_value'
    const value = Config.get('test_key')
    assert.equal(value, 'env_value')
  })

  afterEach(async () => {
    // Cleanup test config
    await fs.remove(path.join(Config.configDir, 'test.json'))
  })
})
