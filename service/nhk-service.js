const EventEmitter = require('events')
const cron = require('node-cron')
const chalk = require('chalk')
const fs = require('fs-extra')
const path = require('path')
const HealthMonitor = require('./health-monitor')
const EpisodeMonitor = require('./episode-monitor')
const DownloadQueue = require('./download-queue')
const NotificationService = require('./notifications')
const WebServer = require('../web/server')
const ServiceConfig = require('../config/service-config')

class NHKService extends EventEmitter {
  constructor(config = {}) {
    super()
    this.config = {
      checkInterval: config.checkInterval || '0 */6 * * *',
      maxConcurrentDownloads: config.maxConcurrentDownloads || 2,
      logLevel: config.logLevel || 'info',
      port: config.port || 8081,
      autoPortDetection: config.autoPortDetection !== false,
      ...config
    }
    this.isRunning = false
    this.activeDownloads = new Map()
    
    // Initialize components
    this.healthMonitor = new HealthMonitor(this)
    this.downloadQueue = new DownloadQueue(this.config.maxConcurrentDownloads)
    this.episodeMonitor = new EpisodeMonitor(this.downloadQueue)
    this.notifications = new NotificationService(this.config.notifications || {})
    this.webServer = new WebServer(this)
    this.serviceConfig = new ServiceConfig()
  }

  async start() {
    console.log(chalk.blue('🚀 Starting NHKollector Service...'))
    
    try {
      // Load configuration
      const config = await this.serviceConfig.load()
      this.config = { ...this.config, ...config.service }
      
      // Find available port if auto-detection is enabled
      if (this.config.autoPortDetection) {
        const availablePort = await this.findAvailablePort()
        if (availablePort !== this.config.port) {
          console.log(chalk.yellow(`⚠️ Port ${this.config.port} in use, using port ${availablePort} instead`))
          this.config.port = availablePort
        }
      }
      
      this.isRunning = true
      
      // Perform initial health check
      console.log(chalk.blue('🔍 Performing initial health check...'))
      const healthResult = await this.healthMonitor.performHealthCheck()
      
      if (healthResult.overall !== 'healthy') {
        console.warn(chalk.yellow('⚠️ Some health checks failed:'))
        Object.entries(healthResult.checks)
          .filter(([, check]) => !check.healthy)
          .forEach(([name, check]) => {
            console.warn(chalk.yellow(`  - ${name}: ${check.message}`))
          })
      } else {
        console.log(chalk.green('✅ All health checks passed'))
      }
      
      // Schedule automatic episode checks
      this.scheduleEpisodeChecks()
      
      // Set up download queue event listeners
      this.setupDownloadQueueEvents()
      
      // Start web interface
      await this.startWebInterface()
      
      // Perform initial episode check
      console.log(chalk.blue('🔍 Performing initial episode check...'))
      await this.checkForNewEpisodes()
      
      console.log(chalk.green('✅ NHKollector Service started'))
      console.log(chalk.blue(`🌐 Web interface available at http://localhost:${this.config.port}`))
      console.log(chalk.gray(`💡 Bookmark this URL: http://localhost:${this.config.port}`))
      this.emit('started')
      
    } catch (error) {
      console.error(chalk.red('❌ Failed to start service:'), error.message)
      throw error
    }
  }

  async findAvailablePort() {
    try {
      const portRange = this.config.portRange || { min: 8081, max: 8090 }
      return await this.serviceConfig.findAvailablePort(portRange.min, portRange.max)
    } catch (error) {
      console.error(chalk.red('❌ Could not find available port:'), error.message)
      throw error
    }
  }

  async startWebInterface() {
    return new Promise((resolve, reject) => {
      this.webServer.server = this.webServer.app.listen(this.config.port, (error) => {
        if (error) {
          if (error.code === 'EADDRINUSE') {
            reject(new Error(`Port ${this.config.port} is already in use. Try a different port or enable autoPortDetection.`))
          } else {
            reject(error)
          }
        } else {
          resolve()
        }
      })
    })
  }

  async stop() {
    console.log(chalk.yellow('🛑 Stopping NHKollector Service...'))
    this.isRunning = false
    
    // Stop scheduled tasks
    if (this.cronJob) {
      this.cronJob.stop()
    }
    
    // Stop web server
    if (this.webServer && this.webServer.server) {
      await new Promise((resolve) => {
        this.webServer.server.close(resolve)
      })
    }
    
    console.log(chalk.green('✅ NHKollector Service stopped'))
    this.emit('stopped')
  }

  scheduleEpisodeChecks() {
    console.log(chalk.blue(`⏰ Scheduling episode checks: ${this.config.checkInterval}`))
    
    this.cronJob = cron.schedule(this.config.checkInterval, async () => {
      if (this.isRunning) {
        console.log(chalk.blue('🔄 Scheduled episode check starting...'))
        await this.checkForNewEpisodes()
      }
    }, {
      scheduled: true,
      timezone: "UTC"
    })
  }

  async checkForNewEpisodes() {
    try {
      await this.episodeMonitor.checkForNewEpisodes()
    } catch (error) {
      console.error(chalk.red('❌ Episode check failed:'), error.message)
      if (this.notifications) {
        await this.notifications.sendError('Episode check failed', error.message)
      }
    }
  }

  setupDownloadQueueEvents() {
    this.downloadQueue.on('downloadStarted', (item) => {
      console.log(chalk.blue(`📥 Started downloading: ${item.episode.title}`))
    })

    this.downloadQueue.on('downloadCompleted', async (item) => {
      console.log(chalk.green(`✅ Completed: ${item.episode.title}`))
      if (this.notifications) {
        await this.notifications.sendDownloadComplete(item.episode)
      }
    })

    this.downloadQueue.on('downloadFailed', async (item) => {
      console.error(chalk.red(`❌ Failed: ${item.episode.title} - ${item.error}`))
      if (this.notifications) {
        await this.notifications.sendDownloadFailed(item.episode, item.error)
      }
    })

    this.downloadQueue.on('queueUpdated', (status) => {
      this.emit('queueUpdated', status)
    })
  }

  async getStatus() {
    const healthCheck = await this.healthMonitor.performHealthCheck()
    const queueStatus = this.downloadQueue.getQueueStatus()
    
    return {
      isRunning: this.isRunning,
      health: healthCheck,
      queue: queueStatus,
      config: {
        checkInterval: this.config.checkInterval,
        maxConcurrentDownloads: this.config.maxConcurrentDownloads,
        port: this.config.port
      }
    }
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log(chalk.yellow('\n🛑 Received SIGINT, shutting down gracefully...'))
  if (global.nhkService) {
    await global.nhkService.stop()
  }
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log(chalk.yellow('\n🛑 Received SIGTERM, shutting down gracefully...'))
  if (global.nhkService) {
    await global.nhkService.stop()
  }
  process.exit(0)
})

// Start service if this file is run directly
if (require.main === module) {
  const service = new NHKService()
  global.nhkService = service
  
  service.start().catch((error) => {
    console.error(chalk.red('❌ Service failed to start:'), error.message)
    process.exit(1)
  })
}

module.exports = NHKService