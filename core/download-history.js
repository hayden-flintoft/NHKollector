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
    } catch (error) {
      await this.save() // Create new file if doesn't exist
    }
  }

  async save() {
    await fs.writeJSON(this.historyFile, this.history, { spaces: 2 })
  }

  isDownloaded(nhkId) {
    return !!this.history.episodes[nhkId]
  }

  async markDownloaded(episode) {
    // Extract NHK ID from URL
    const nhkId = episode.url.match(/\/(\d+)\/?$/)?.[1]
    if (!nhkId) return

    this.history.episodes[nhkId] = {
      show: episode.show,
      title: episode.title,
      downloadedAt: new Date().toISOString()
    }
    
    await this.save()
  }
}

module.exports = DownloadHistory