const { exec } = require('child_process')
const { promisify } = require('util')
const fs = require('fs-extra')
const path = require('path')
const axios = require('axios')
const net = require('net')

const execAsync = promisify(exec)

class HealthMonitor {
  constructor(nhkService) {
    this.nhkService = nhkService
    this.checks = new Map()
  }

  async performHealthCheck() {
    const results = {
      timestamp: new Date(),
      overall: 'healthy',
      checks: {}
    }

    // Check disk space
    results.checks.diskSpace = await this.checkDiskSpace()
    
    // Check network connectivity
    results.checks.network = await this.checkNetworkConnectivity()
    
    // Check yt-dlp availability
    results.checks.ytdlp = await this.checkYtDlp()
    
    // Check TVDB connectivity
    results.checks.tvdb = await this.checkTVDBConnectivity()

    // Check downloads directory
    results.checks.downloadsDir = await this.checkDownloadsDirectory()

    // Check configuration files
    results.checks.config = await this.checkConfiguration()

    // Add port check
    results.checks.port = await this.checkPortAvailability()

    // Determine overall health
    const failedChecks = Object.values(results.checks).filter(check => !check.healthy)
    if (failedChecks.length > 0) {
      results.overall = 'unhealthy'
    }

    return results
  }

  async checkDiskSpace() {
    try {
      const downloadsPath = path.join(process.cwd(), 'downloads')
      const { stdout } = await execAsync(`df -h "${downloadsPath}" | tail -1`)
      const parts = stdout.trim().split(/\s+/)
      const usedPercent = parseInt(parts[4].replace('%', ''))
      
      return {
        healthy: usedPercent < 90,
        message: `Disk usage: ${usedPercent}%`,
        details: {
          used: parts[2],
          available: parts[3],
          usedPercent: usedPercent
        }
      }
    } catch (error) {
      return {
        healthy: false,
        message: `Disk space check failed: ${error.message}`,
        error: error.message
      }
    }
  }

  async checkNetworkConnectivity() {
    try {
      const response = await axios.get('https://www3.nhk.or.jp/nhkworld/en/', {
        timeout: 10000
      })
      
      return {
        healthy: response.status === 200,
        message: 'NHK World accessible',
        details: {
          status: response.status,
          responseTime: response.headers['x-response-time'] || 'unknown'
        }
      }
    } catch (error) {
      return {
        healthy: false,
        message: `Network connectivity failed: ${error.message}`,
        error: error.message
      }
    }
  }

  async checkYtDlp() {
    try {
      const { stdout } = await execAsync('yt-dlp --version')
      const version = stdout.trim()
      
      return {
        healthy: true,
        message: `yt-dlp available: ${version}`,
        details: { version }
      }
    } catch (error) {
      return {
        healthy: false,
        message: 'yt-dlp not available or not working',
        error: error.message
      }
    }
  }

  async checkTVDBConnectivity() {
    try {
      const response = await axios.get('https://thetvdb.com/', {
        timeout: 10000
      })
      
      return {
        healthy: response.status === 200,
        message: 'TVDB accessible',
        details: { status: response.status }
      }
    } catch (error) {
      return {
        healthy: false,
        message: `TVDB connectivity failed: ${error.message}`,
        error: error.message
      }
    }
  }

  async checkDownloadsDirectory() {
    try {
      const downloadsPath = path.join(process.cwd(), 'downloads')
      const exists = await fs.pathExists(downloadsPath)
      
      if (!exists) {
        await fs.ensureDir(downloadsPath)
      }
      
      // Test write permissions
      const testFile = path.join(downloadsPath, '.health-check')
      await fs.writeFile(testFile, 'test')
      await fs.remove(testFile)
      
      return {
        healthy: true,
        message: 'Downloads directory accessible and writable',
        details: { path: downloadsPath }
      }
    } catch (error) {
      return {
        healthy: false,
        message: `Downloads directory check failed: ${error.message}`,
        error: error.message
      }
    }
  }

  async checkConfiguration() {
    try {
      const configPath = path.join(process.cwd(), 'config', 'shows.json')
      const exists = await fs.pathExists(configPath)
      
      if (!exists) {
        return {
          healthy: false,
          message: 'shows.json configuration file not found',
          error: 'Configuration missing'
        }
      }
      
      const config = await fs.readJSON(configPath)
      const showCount = Array.isArray(config) ? config.length : 0
      
      return {
        healthy: true,
        message: `Configuration loaded: ${showCount} shows configured`,
        details: { showCount, path: configPath }
      }
    } catch (error) {
      return {
        healthy: false,
        message: `Configuration check failed: ${error.message}`,
        error: error.message
      }
    }
  }

  async checkPortAvailability() {
    try {
      // Get the current port from the service
      const port = this.nhkService?.config?.port || 8081
      const isAvailable = await this.isPortAvailable(port)
      
      return {
        healthy: isAvailable,
        message: isAvailable ? 
          `Port ${port} is available` : 
          `Port ${port} is in use (qBittorrent or other service?)`,
        details: { 
          port,
          suggestion: isAvailable ? null : 'Service will try to find an available port automatically'
        }
      }
    } catch (error) {
      return {
        healthy: false,
        message: `Port check failed: ${error.message}`,
        error: error.message
      }
    }
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

module.exports = HealthMonitor