const NHKScraper = require('../core/nhk-scraper')
const TVDBScraper = require('../core/tvdb-scraper')
const DownloadHistory = require('../core/download-history')
const fs = require('fs-extra')
const path = require('path')
const chalk = require('chalk')

class EpisodeMonitor {
  constructor(downloadQueue) {
    this.downloadQueue = downloadQueue
    this.nhkScraper = new NHKScraper()
    this.tvdbScraper = new TVDBScraper()
    this.history = new DownloadHistory()
  }

  async checkForNewEpisodes() {
    console.log(chalk.blue('🔍 Checking for new episodes...'))
    
    try {
      await this.history.init()
      // Check if tvdbScraper has init method
      if (typeof this.tvdbScraper.init === 'function') {
        await this.tvdbScraper.init()
      }
      
      const shows = await this.loadShows()
      
      for (const show of shows) {
        await this.checkShow(show)
      }
      
      console.log(chalk.green('✅ Episode check completed'))
    } catch (error) {
      console.error(chalk.red('❌ Error checking episodes:'), error.message)
      throw error
    }
  }

  async loadShows() {
    const showsPath = path.join(process.cwd(), 'config', 'shows.json')
    
    if (!await fs.pathExists(showsPath)) {
      console.warn(chalk.yellow('⚠️ No shows.json found, creating empty configuration'))
      await fs.ensureDir(path.dirname(showsPath))
      await fs.writeJSON(showsPath, [])
      return []
    }
    
    const showConfigs = await fs.readJSON(showsPath)
    return Array.isArray(showConfigs) ? showConfigs : []
  }

  async checkShow(show) {
    console.log(chalk.blue(`📺 Checking: ${show.name}`))
    
    try {
      // Use the correct method name from your NHKScraper
      const episodes = await this.nhkScraper.scrapeShowEpisodes ? 
        await this.nhkScraper.scrapeShowEpisodes(show.nhkUrl) :
        await this.nhkScraper.scrapeEpisodeDetails(show.nhkUrl)
      
      if (!episodes || !Array.isArray(episodes)) {
        console.warn(chalk.yellow(`⚠️ No episodes found for ${show.name}`))
        return
      }
      
      const newEpisodes = episodes.filter(ep => !this.history.isDownloaded(ep.nhkId || ep.id))
      
      if (newEpisodes.length > 0) {
        console.log(chalk.green(`📥 Found ${newEpisodes.length} new episodes for ${show.name}`))
        
        for (const episode of newEpisodes) {
          // Get TVDB metadata if available
          try {
            const seasonEpisode = await this.tvdbScraper.findEpisodeInfo(
              show.tvdbUrl, 
              episode.title
            )
            
            if (seasonEpisode) {
              episode.seasonEpisode = seasonEpisode
            }
          } catch (tvdbError) {
            console.warn(chalk.yellow(`⚠️ TVDB lookup failed for ${episode.title}: ${tvdbError.message}`))
          }
          
          episode.show = show
          this.downloadQueue.addToQueue(episode)
        }
      } else {
        console.log(chalk.gray(`No new episodes for ${show.name}`))
      }
    } catch (error) {
      console.error(chalk.red(`❌ Error checking show ${show.name}:`, error.message))
    }
  }
}

module.exports = EpisodeMonitor