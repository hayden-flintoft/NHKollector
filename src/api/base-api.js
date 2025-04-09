const axios = require('axios')
const fs = require('fs-extra')
const path = require('path')
const chalk = require('chalk')

const debugLog = (msg) => console.log(chalk.gray(`🔍 [DEBUG] ${msg}`))

class BaseApiClient {
  constructor(config) {
    this.baseURL = config.baseURL
    this.dataDir = path.join(__dirname, '../../data', config.dataDir)
    this.tokenFile = path.join(this.dataDir, 'token.json')
    this.apiKey = process.env[config.apiKeyEnv]

    if (!this.apiKey) {
      throw new Error(`${config.apiKeyEnv} not found in environment variables`)
    }
  }

  async init() {
    try {
      await fs.ensureDir(this.dataDir)
      const token = await this.getStoredToken()
      if (!token) {
        await this.authenticate()
      }
    } catch (error) {
      console.error(
        chalk.red(`Failed to initialize ${this.constructor.name}:`),
        error.message
      )
      throw error
    }
  }

  async getStoredToken() {
    try {
      if (await fs.pathExists(this.tokenFile)) {
        const tokenData = await fs.readJson(this.tokenFile)
        if (new Date(tokenData.expiresAt) > new Date()) {
          return tokenData.token
        }
      }
      return null
    } catch (error) {
      console.error(chalk.yellow('Error reading stored token:', error.message))
      return null
    }
  }

  async authenticate() {
    throw new Error('authenticate() must be implemented by child class')
  }

  async request(method, url, options = {}) {
    try {
      const token = await this.getStoredToken()
      if (!token) {
        await this.authenticate()
      }

      const response = await axios({
        method,
        url: `${this.baseURL}${url}`,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...options.headers,
        },
        ...options,
      })

      return response.data
    } catch (error) {
      console.error(
        chalk.red(`API request failed (${method} ${url}):`),
        error.message
      )
      throw error
    }
  }

  async saveToCache(key, data) {
    const cacheFile = path.join(this.dataDir, `${key}.json`)
    await fs.writeJson(
      cacheFile,
      {
        data,
        timestamp: new Date().toISOString(),
      },
      { spaces: 2 }
    )
  }

  async getFromCache(key) {
    const cacheFile = path.join(this.dataDir, `${key}.json`)
    if (await fs.pathExists(cacheFile)) {
      return (await fs.readJson(cacheFile)).data
    }
    return null
  }
}

module.exports = BaseApiClient
