const axios = require('axios')
const chalk = require('chalk')
const fs = require('fs-extra')
const path = require('path')

class NHKApi {
  constructor() {
    this.baseUrl = 'https://api.nhk.or.jp/v2'
    this.apiKey = process.env.NHK_API_KEY
    this.logsDir = path.join(__dirname, '../../logs/nhk-api')
    this.responsesDir = path.join(this.logsDir, 'responses')
    this.errorsDir = path.join(this.logsDir, 'errors')
  }

  async init() {
    await fs.ensureDir(this.responsesDir)
    await fs.ensureDir(this.errorsDir)
  }

  async saveLog(type, data, prefix) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `${prefix}-${timestamp}.json`
    const dir = type === 'error' ? this.errorsDir : this.responsesDir

    // Extract only the necessary data
    const logData = {
      timestamp,
      url: data.config?.url,
      method: data.config?.method,
      status: data.status,
      statusText: data.statusText,
      headers: data.headers,
      data: type === 'response' ? data.data : data.response?.data,
      error:
        type === 'error'
          ? {
              message: data.message,
              code: data.code,
              status: data.response?.status,
            }
          : undefined,
    }

    await fs.writeJson(path.join(dir, filename), logData, { spaces: 2 })
    return filename
  }

  async getProgramList(
    area = '130',
    service = 'g1',
    date = new Date().toISOString().split('T')[0]
  ) {
    try {
      const url = `${this.baseUrl}/pg/list/${area}/${service}/${date}.json`
      console.log(chalk.blue('🔍 Getting program list...'))

      const response = await axios.get(url, {
        params: { key: this.apiKey },
        headers: {
          Accept: 'application/json',
          'User-Agent': 'NHKTool/1.0',
        },
      })

      const logFile = await this.saveLog('response', response, 'program-list')
      console.log(chalk.gray(`Response saved to: ${logFile}`))

      return response.data
    } catch (error) {
      const logFile = await this.saveLog(
        'error',
        {
          message: error.message,
          code: error.code,
          response: error.response,
          config: {
            url: error.config?.url,
            method: error.config?.method,
            headers: error.config?.headers,
          },
        },
        'program-list-error'
      )

      console.error(chalk.red('Failed to get program list:'), error.message)
      console.error(chalk.gray(`Error details saved to: ${logFile}`))
      throw error
    }
  }

  async getProgramInfo(programId, area = '130', service = 'g1') {
    try {
      const url = `${this.baseUrl}/pg/info/${area}/${service}/${programId}.json`
      console.log(chalk.blue(`🔍 Getting program info for ID: ${programId}`))

      const response = await axios.get(url, {
        params: { key: this.apiKey },
        headers: {
          Accept: 'application/json',
          'User-Agent': 'NHKTool/1.0',
        },
      })

      const logFile = await this.saveLog(
        'response',
        response,
        `program-info-${programId}`
      )
      console.log(chalk.gray(`Response saved to: ${logFile}`))

      return response.data
    } catch (error) {
      const logFile = await this.saveLog(
        'error',
        {
          message: error.message,
          response: error.response?.data,
          config: {
            url: error.config?.url,
            method: error.config?.method,
            headers: error.config?.headers,
          },
          programId,
          area,
          service,
        },
        `program-info-error-${programId}`
      )

      console.error(
        chalk.red(`Failed to get program info for ${programId}:`),
        error.message
      )
      console.error(chalk.gray(`Error details saved to: ${logFile}`))
      throw error
    }
  }
}

module.exports = NHKApi
