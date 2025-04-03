const Logger = require('../../src/utils/logger')
const fs = require('fs-extra')
const path = require('path')
const assert = require('assert')

describe('Logger', () => {
  beforeEach(async () => {
    await Logger.init()
  })

  it('should write to log files', async () => {
    const testMsg = 'Test log message'
    Logger.info('TEST', testMsg)

    const logFile = path.join(Logger.logDir, 'info.log')
    const content = await fs.readFile(logFile, 'utf8')
    assert(content.includes(testMsg))
  })

  it('should handle errors', async () => {
    const error = new Error('Test error')
    Logger.error('TEST', 'Error occurred', error)

    const logFile = path.join(Logger.logDir, 'error.log')
    const content = await fs.readFile(logFile, 'utf8')
    assert(content.includes('Test error'))
    assert(content.includes(error.stack))
  })
})
