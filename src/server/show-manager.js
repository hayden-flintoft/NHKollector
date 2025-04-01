// src/server/show-manager.js
const fs = require('fs-extra')
const path = require('path')
const chalk = require('chalk')
const TVDBApi = require('./tvdb-api')

class ShowManager {
  constructor() {
    this.configDir = path.join(__dirname, '../config')
    this.showsFile = path.join(this.configDir, 'shows.json')
    this.tvdb = new TVDBApi()
    this.shows = []
  }

  async init() {
    try {
      await fs.ensureDir(this.configDir)
      await this.loadShows()
      console.log(chalk.blue(`📺 Loaded ${this.shows.length} shows`))
    } catch (error) {
      console.error(
        chalk.red('Failed to initialize show manager:'),
        error.message
      )
      throw error
    }
  }

  async loadShows() {
    try {
      if (await fs.pathExists(this.showsFile)) {
        this.shows = await fs.readJson(this.showsFile)
      } else {
        this.shows = []
        await this.saveShows()
      }
    } catch (error) {
      console.error(chalk.red('Error loading shows:'), error.message)
      this.shows = []
    }
  }

  async saveShows() {
    await fs.writeJson(this.showsFile, this.shows, { spaces: 2 })
  }

  async addShow(showConfig) {
    // Check for duplicates
    const isDuplicate = this.shows.some(
      (show) =>
        show.tvdbId === showConfig.tvdbId ||
        (showConfig.nhkId && show.nhkId === showConfig.nhkId)
    )

    if (isDuplicate) {
      console.log(chalk.yellow(`⚠️ Show already exists: ${showConfig.name}`))
      return false
    }

    // Verify show exists on TVDB
    try {
      const seriesInfo = await this.tvdb.getSeriesById(showConfig.tvdbId)
      showConfig.name = showConfig.name || seriesInfo.name
      showConfig.enabled = showConfig.enabled ?? true
      showConfig.lastChecked = null

      this.shows.push(showConfig)
      await this.saveShows()

      console.log(chalk.green(`✅ Added show: ${showConfig.name}`))
      return true
    } catch (error) {
      console.error(chalk.red(`Failed to add show: ${error.message}`))
      return false
    }
  }

  async removeShow(tvdbId) {
    const index = this.shows.findIndex((show) => show.tvdbId === tvdbId)
    if (index !== -1) {
      this.shows.splice(index, 1)
      await this.saveShows()
      return true
    }
    return false
  }

  getShows() {
    return this.shows
  }

  async updateShow(tvdbId, updates) {
    const show = this.shows.find((s) => s.tvdbId === tvdbId)
    if (show) {
      Object.assign(show, updates)
      await this.saveShows()
      return true
    }
    return false
  }

  // Add method to clean duplicates from existing data
  async cleanDuplicates() {
    const unique = {}
    const cleaned = this.shows.filter((show) => {
      const key = `${show.tvdbId}_${show.nhkId}`
      if (unique[key]) {
        return false
      }
      unique[key] = true
      return true
    })

    if (cleaned.length !== this.shows.length) {
      console.log(
        chalk.yellow(
          `⚠️ Removed ${this.shows.length - cleaned.length} duplicate shows`
        )
      )
      this.shows = cleaned
      await this.saveShows()
    }

    return cleaned
  }
}

module.exports = ShowManager
