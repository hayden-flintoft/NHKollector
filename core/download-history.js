const fs = require('fs-extra')
const path = require('path')

class DownloadHistory {
  constructor() {
    this.historyFile = path.join(process.cwd(), 'data', 'downloaded.json')
    this.history = { episodes: {} }
  }

  async init() {
    await fs.ensureDir(path.dirname(this.historyFile))
    try {
      this.history = await fs.readJSON(this.historyFile)
      // Ensure episodes key exists
      if (!this.history.episodes || typeof this.history.episodes !== 'object') {
        this.history.episodes = {}
      }
    } catch (error) {
      this.history = { episodes: {} }
      await this.save() // Create new file if doesn't exist
    }
  }

  async save() {
    await fs.writeJSON(this.historyFile, this.history, { spaces: 2 })
  }

  isDownloaded(nhkId) {
    if (!nhkId) return false
    if (!this.history.episodes || typeof this.history.episodes !== 'object') return false
    return !!this.history.episodes[nhkId]
  }

  async markDownloaded(episode) {
    // Extract NHK ID from URL
    const nhkId = episode.nhkId || episode.url.match(/\/(\d+)\/?$/)?.[1]
    if (!nhkId) {
      console.warn(`⚠️ Could not extract NHK ID for episode: ${episode.title}`)
      return
    }

    this.history.episodes[nhkId] = {
      show: episode.show,
      title: episode.title,
      downloadedAt: new Date().toISOString()
    }
    
    await this.save()
  }
}

module.exports = DownloadHistory