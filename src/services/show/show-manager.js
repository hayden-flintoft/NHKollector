const fs = require('fs-extra')
const path = require('path')
const chalk = require('chalk')
// const TVDBApi = require('../../api/tvdb-api') // Fix import path

class ShowManager {
  constructor() {
    this.configDir = path.join(__dirname, '../../../config') // Fix path
    this.showsFile = path.join(this.configDir, 'shows.json')
    // this.tvdb = new TVDBApi()
    this.shows = new Map() // Change array to Map for easier lookups
  }

  async init() {
    try {
      await fs.ensureDir(this.configDir)
      await this.loadShows()
      console.log(chalk.blue(`📺 Loaded ${this.shows.size} shows`))
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
        const showsArray = await fs.readJson(this.showsFile)
        // Convert array to Map using nhkId as key
        this.shows = new Map(showsArray.map((show) => [show.nhkId, show]))
      } else {
        this.shows = new Map()
        await this.saveShows()
      }
    } catch (error) {
      console.error(chalk.red('Error loading shows:'), error.message)
      this.shows = new Map()
    }
  }

  async saveShows() {
    // Convert Map back to array for storage
    const showsArray = Array.from(this.shows.values())
    await fs.writeJson(this.showsFile, showsArray, { spaces: 2 })
  }

  async addShow(showConfig) {
    if (this.shows.has(showConfig.nhkId)) {
      console.log(chalk.yellow(`⚠️ Show already exists: ${showConfig.name}`))
      return false
    }

    // Verify show exists on TVDB
    try {
      const seriesInfo = await this.tvdb.getSeriesById(showConfig.tvdbId)
      showConfig.name = showConfig.name || seriesInfo.name
      showConfig.enabled = showConfig.enabled ?? true
      showConfig.lastChecked = null

      this.shows.set(showConfig.nhkId, showConfig)
      await this.saveShows()

      console.log(chalk.green(`✅ Added show: ${showConfig.name}`))
      return true
    } catch (error) {
      console.error(chalk.red(`Failed to add show: ${error.message}`))
      return false
    }
  }

  async removeShow(nhkId) {
    const removed = this.shows.delete(nhkId)
    if (removed) {
      await this.saveShows()
    }
    return removed
  }

  getShow(nhkId) {
    return this.shows.get(nhkId)
  }

  // Rename getShows to getAllShows for clarity
  getAllShows() {
    return Array.from(this.shows.values())
  }

  async updateShow(nhkId, updates) {
    const show = this.shows.get(nhkId)
    if (show) {
      this.shows.set(nhkId, { ...show, ...updates })
      await this.saveShows()
      return true
    }
    return false
  }

  // Add method to clean duplicates from existing data
  async cleanDuplicates() {
    const unique = {}
    const cleaned = Array.from(this.shows.values()).filter((show) => {
      const key = `${show.tvdbId}_${show.nhkId}`
      if (unique[key]) {
        return false
      }
      unique[key] = true
      return true
    })

    if (cleaned.length !== this.shows.size) {
      console.log(
        chalk.yellow(
          `⚠️ Removed ${this.shows.size - cleaned.length} duplicate shows`
        )
      )
      this.shows = new Map(cleaned.map((show) => [show.nhkId, show]))
      await this.saveShows()
    }

    return cleaned
  }
}

module.exports = ShowManager
