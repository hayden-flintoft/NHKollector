const fs = require('fs-extra')
const path = require('path')
const dotenv = require('dotenv')

class Config {
  static configDir = path.join(__dirname, '../../config')
  static configCache = new Map()

  static async load() {
    // Load environment variables
    dotenv.config()

    // Ensure config directory exists
    await fs.ensureDir(this.configDir)

    // Load all JSON config files
    const files = await fs.readdir(this.configDir)
    for (const file of files) {
      if (file.endsWith('.json')) {
        const name = path.basename(file, '.json')
        const data = await fs.readJson(path.join(this.configDir, file))
        this.configCache.set(name, data)
      }
    }
  }

  static get(key) {
    // Check environment variables first
    const envValue = process.env[key.toUpperCase()]
    if (envValue) return envValue

    // Check config files
    const [file, ...path] = key.split('.')
    const config = this.configCache.get(file)

    if (!config) return null

    // Navigate nested object path
    return path.reduce((obj, key) => obj?.[key], config)
  }

  static getAuthConfig() {
    return {
      tvdb: {
        apiKey: this.get('tvdb.apiKey'),
        pin: this.get('tvdb.pin'),
      },
      nhk: {
        apiKey: this.get('nhk.apiKey'),
      },
    }
  }
}

module.exports = Config
