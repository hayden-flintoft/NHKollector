// src/server/show-manager.js
const fs = require('fs-extra')
const path = require('path')
const chalk = require('chalk')

class ShowManager {
  constructor() {
    this.showsFile = path.join(__dirname, '../config/shows.json')
    this.downloadedFile = path.join(__dirname, '../config/downloaded.json')
    this.shows = []
    this.downloadedEpisodes = new Set()

    this._loadData()
  }

  async _loadData() {
    try {
      this.shows = await fs.readJson(this.showsFile)
      const downloaded = await fs.readJson(this.downloadedFile)
      this.downloadedEpisodes = new Set(downloaded)
    } catch (err) {
      console.log(chalk.yellow('No existing data files, starting fresh'))
      this.shows = []
      this.downloadedEpisodes = new Set()
    }
  }

  async addShow(showConfig) {
    this.shows.push(showConfig)
    await this._saveShows()
  }

  async markAsDownloaded(episodeId) {
    this.downloadedEpisodes.add(episodeId)
    await fs.writeJson(this.downloadedFile, [...this.downloadedEpisodes])
  }

  hasDownloaded(episodeId) {
    return this.downloadedEpisodes.has(episodeId)
  }

  async _saveShows() {
    await fs.writeJson(this.showsFile, this.shows)
  }

  getShows() {
    return this.shows
  }
}

module.exports = ShowManager
