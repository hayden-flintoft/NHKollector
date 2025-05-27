#!/usr/bin/env node
const path = require('path')
const fs = require('fs-extra')
const chalk = require('chalk')
const NHKScraper = require('./core/nhk-scraper')
const Downloader = require('./core/downloader')
const DownloadHistory = require('./core/download-history')
const Show = require('./core/models/show')
const Episode = require('./core/models/episode')
const TVDBScraper = require('./core/tvdb-scraper')

const SHOWS_CONFIG = path.join(__dirname, 'config', 'shows.json')

async function main() {
  const tvdbScraper = new TVDBScraper()
  
  try {
    // Load show configuration
    const showConfig = await fs.readJson(SHOWS_CONFIG)
    const show = new Show(showConfig[0])
    show.validate()

    // Get episodes from NHK
    const scraper = new NHKScraper()
    const episodes = await scraper.scrapeShowEpisodes(show.nhkUrl)
    
    // Fetch episode numbers for each episode
    console.log(chalk.blue('\n🔍 Fetching episode numbers from TVDB...'))
    for (const episode of episodes) {
      const seasonEpisode = await tvdbScraper.findEpisodeInfo(show.tvdbUrl, episode.title)
      if (seasonEpisode) {
        episode.seasonEpisode = seasonEpisode
      }
    }

    // Create Episode instances
    const episodeModels = episodes.map(data => new Episode({
      show: show.name,
      seasonEpisode: data.seasonEpisode,
      ...data
    }))

    // Initialize download history
    const history = new DownloadHistory()
    await history.init()

    console.log(chalk.blue('🔍 Getting episodes from:', show.nhkUrl))
    
    console.log(chalk.blue('📺 Show Information:'))
    console.log(chalk.blue('Show Title:', episodes[0]?.show || 'Unknown'))
    console.log(chalk.blue('\n📝 Found Episodes:'))
    
    // Filter out already downloaded episodes
    const newEpisodes = episodes.filter(episode => !history.isDownloaded(episode.nhkId))
    
    episodes.forEach(episode => {
      const status = history.isDownloaded(episode.nhkId) ? '✅' : '⏳'
      console.log(chalk.blue(`${status} ${episode.title}`))
    })

    console.log(chalk.green(`\n✅ Found ${episodes.length} episodes total (${newEpisodes.length} new)`))
    
    if (newEpisodes.length === 0) {
      console.log(chalk.blue('No new episodes to download'))
      return
    }

    console.log(chalk.blue('\n⏳ Starting downloads...\n'))

    const downloader = new Downloader()
    await downloader.init()

    // When downloading, the episode number will now be included in the filename
    for (const episode of newEpisodes) {
      try {
        await downloader.downloadEpisode(episode)
        await history.markDownloaded(episode)
        console.log(chalk.green(`✅ Downloaded: ${episode.toFileName()}`))
      } catch (error) {
        console.error(chalk.red(`❌ Failed to download ${episode.title}:`, error.message))
      }
    }

  } catch (error) {
    console.error(chalk.red('❌ Error:', error.message))
    process.exit(1)
  } finally {
    await tvdbScraper.cleanup()
  }
}

if (require.main === module) {
  main()
}

module.exports = main
