const fs = require('fs-extra')
const path = require('path')
const net = require('net')

class ServiceConfig {
  constructor() {
    this.configFile = path.join(process.cwd(), 'config', 'service.json')
    this.defaults = {
      service: {
        checkInterval: '0 */6 * * *', // Every 6 hours
        maxConcurrentDownloads: 2,
        logLevel: 'info',
        autoStart: true,
        port: 8081, // Changed default to avoid qBittorrent conflict
        autoPortDetection: true, // Enable automatic port detection
        portRange: { min: 8081, max: 8090 } // Port range to try
      },
      notifications: {
        enabled: false,
        webhook: null,
        email: null
      },
      downloads: {
        retryAttempts: 3,
        retryDelay: 300000, // 5 minutes
        qualityPreference: 'best'
      }
    }
  }

  async load() {
    try {
      if (await fs.pathExists(this.configFile)) {
        const config = await fs.readJSON(this.configFile)
        return { ...this.defaults, ...config }
      }
      return this.defaults
    } catch (error) {
      console.warn('Error loading service config, using defaults:', error.message)
      return this.defaults
    }
  }

  async save(config) {
    await fs.ensureDir(path.dirname(this.configFile))
    await fs.writeJSON(this.configFile, config, { spaces: 2 })
  }

  async findAvailablePort(startPort = 8081, endPort = 8090) {
    for (let port = startPort; port <= endPort; port++) {
      if (await this.isPortAvailable(port)) {
        return port
      }
    }
    throw new Error(`No available ports found in range ${startPort}-${endPort}`)
  }

  isPortAvailable(port) {
    return new Promise((resolve) => {
      const server = net.createServer()
      
      server.listen(port, () => {
        server.once('close', () => {
          resolve(true)
        })
        server.close()
      })
      
      server.on('error', () => {
        resolve(false)
      })
    })
  }
}

module.exports = ServiceConfig