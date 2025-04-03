const chalk = require('chalk')
const fs = require('fs-extra')
const path = require('path')

class Logger {
  static logDir = path.join(__dirname, '../../logs')
  static logLevels = ['debug', 'info', 'error']

  static async init() {
    await fs.ensureDir(this.logDir)
  }

  static debug(module, msg) {
    this._log('debug', module, msg)
  }

  static info(module, msg) {
    this._log('info', module, msg)
  }

  static error(module, msg, error = null) {
    this._log('error', module, msg, error)
  }

  static _log(level, module, msg, error = null) {
    const timestamp = new Date().toISOString()
    const moduleStr = `[${module}]`.padEnd(15)

    // Console output
    const color = {
      debug: 'gray',
      info: 'blue',
      error: 'red',
    }[level]

    console.log(
      chalk[color](`${timestamp} ${level.toUpperCase()} ${moduleStr} ${msg}`)
    )

    if (error) {
      console.error(chalk.red(error.stack || error))
    }

    // File logging
    const logFile = path.join(this.logDir, `${level}.log`)
    const logEntry = `${timestamp} ${moduleStr} ${msg}${
      error ? '\n' + error.stack : ''
    }\n`

    fs.appendFile(logFile, logEntry).catch((err) => {
      console.error('Failed to write to log file:', err)
    })
  }
}

module.exports = Logger
