const EventEmitter = require('events')
const chalk = require('chalk')
const DownloadHistory = require('../core/download-history')

class DownloadQueue extends EventEmitter {
  constructor(maxConcurrent = 2) {
    super()
    this.queue = []
    this.active = new Map()
    this.completed = []
    this.failed = []
    this.maxConcurrent = maxConcurrent
    this.history = new DownloadHistory()
    this.initialized = false
  }

  async init() {
    if (!this.initialized) {
      await this.history.init()
      this.initialized = true
    }
  }

  addToQueue(episode, priority = 'normal') {
    const queueItem = {
      id: `${episode.show?.name || 'unknown'}-${episode.nhkId || episode.id || Date.now()}`,
      episode,
      priority,
      addedAt: new Date(),
      status: 'queued',
      retryCount: 0
    }

    // Check if already queued or active
    const existing = this.queue.find(item => item.id === queueItem.id) || 
                    this.active.get(queueItem.id)
    
    if (existing) {
      console.log(chalk.yellow(`⚠️ Episode already in queue: ${episode.title}`))
      return
    }

    this.queue.push(queueItem)
    this.sortQueue()
    this.emit('queueUpdated', this.getQueueStatus())
    
    console.log(chalk.blue(`📋 Added to queue: ${episode.title}`))
    this.processQueue()
  }

  sortQueue() {
    this.queue.sort((a, b) => {
      // Priority order: high, normal, low
      const priorityOrder = { high: 3, normal: 2, low: 1 }
      const aPriority = priorityOrder[a.priority] || 2
      const bPriority = priorityOrder[b.priority] || 2
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority
      }
      
      // Same priority, sort by added time (FIFO)
      return new Date(a.addedAt) - new Date(b.addedAt)
    })
  }

  async processQueue() {
    if (!this.initialized) {
      await this.init()
    }

    if (this.active.size >= this.maxConcurrent || this.queue.length === 0) {
      return
    }

    const item = this.queue.shift()
    this.active.set(item.id, item)
    item.status = 'downloading'
    item.startedAt = new Date()
    
    this.emit('downloadStarted', item)
    this.emit('queueUpdated', this.getQueueStatus())

    try {
      console.log(chalk.blue(`📥 Downloading: ${item.episode.title}`))
      
      // Import downloader dynamically to avoid circular dependencies
      const Downloader = require('../core/downloader')
      const downloader = new Downloader()
      
      await downloader.downloadEpisode(item.episode)
      await this.history.markDownloaded(item.episode.nhkId || item.episode.id)
      
      item.status = 'completed'
      item.completedAt = new Date()
      this.completed.push(item)
      this.emit('downloadCompleted', item)
      
    } catch (error) {
      console.error(chalk.red(`❌ Download failed: ${item.episode.title}`), error.message)
      
      item.status = 'failed'
      item.error = error.message
      item.failedAt = new Date()
      
      if (item.retryCount < 3) {
        item.retryCount++
        item.status = 'retrying'
        console.log(chalk.yellow(`🔄 Retrying in 5 minutes (attempt ${item.retryCount + 1}/4): ${item.episode.title}`))
        
        setTimeout(() => {
          item.status = 'queued'
          this.queue.unshift(item) // Add to front of queue for retry
          this.processQueue()
        }, 300000) // 5 min delay
      } else {
        this.failed.push(item)
        this.emit('downloadFailed', item)
      }
    } finally {
      this.active.delete(item.id)
      this.emit('queueUpdated', this.getQueueStatus())
      this.processQueue() // Process next item
    }
  }

  getQueueStatus() {
    return {
      queued: this.queue.length,
      active: this.active.size,
      completed: this.completed.length,
      failed: this.failed.length,
      queue: this.queue.map(item => ({
        id: item.id,
        title: item.episode.title,
        status: item.status,
        priority: item.priority,
        addedAt: item.addedAt,
        retryCount: item.retryCount
      })),
      activeDownloads: Array.from(this.active.values()).map(item => ({
        id: item.id,
        title: item.episode.title,
        status: item.status,
        startedAt: item.startedAt
      }))
    }
  }

  removeFromQueue(itemId) {
    const index = this.queue.findIndex(item => item.id === itemId)
    if (index !== -1) {
      const removed = this.queue.splice(index, 1)[0]
      this.emit('queueUpdated', this.getQueueStatus())
      return removed
    }
    return null
  }

  clearCompleted() {
    this.completed = []
    this.emit('queueUpdated', this.getQueueStatus())
  }

  clearFailed() {
    this.failed = []
    this.emit('queueUpdated', this.getQueueStatus())
  }
}

module.exports = DownloadQueue