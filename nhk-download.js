#!/usr/bin/env node
const path = require('path')
const fs = require('fs-extra')
const chalk = require('chalk')
const NHKScraper = require('./core/nhk-scraper')
const TVDBScraper = require('./core/tvdb-scraper')
const DownloadHistory = require('./core/download-history')
const Show = require('./core/models/show')
const Episode = require('./core/models/episode')

const SHOWS_CONFIG = path.join(__dirname, 'config', 'shows.json')

async function processShow(show, tvdbScraper, history) {
  console.log(chalk.blue(`\n📺 Processing show: ${show.name}`))

  // Get episodes from NHK
  const scraper = new NHKScraper()
  const episodes = await scraper.scrapeShowEpisodes(show.nhkUrl)
  
  // Fetch episode numbers for each episode
  console.log(chalk.blue('\n🔍 Fetching episode numbers from TVDB...'))
  for (const episode of episodes) {
    const seasonEpisode = await tvdbScraper.findEpisodeInfo(
      show.tvdbUrl, 
      episode.title,
      { showName: show.name }
    )
    if (seasonEpisode) {
      episode.seasonEpisode = seasonEpisode
    }
  }

  // Filter out already downloaded episodes
  const newEpisodes = episodes.filter(episode => !history.isDownloaded(episode.nhkId))
  
  console.log(chalk.blue('\n📝 Episode Status:'))
  episodes.forEach(episode => {
    const status = history.isDownloaded(episode.nhkId) ? '✅' : '⏳'
    console.log(chalk.gray(`${status} ${episode.title} ${episode.seasonEpisode || ''}`))
  })

  return { newEpisodes, totalEpisodes: episodes.length }
}

async function main() {
  const tvdbScraper = new TVDBScraper()
  
  try {
    // Load show configurations
    const showConfigs = await fs.readJson(SHOWS_CONFIG)
    const shows = showConfigs.map(config => new Show(config))
    
    // Validate all shows
    shows.forEach(show => show.validate())

    // Initialize download history
    const history = new DownloadHistory()
    await history.init()

    // Process each show
    for (const show of shows) {
      const { newEpisodes, totalEpisodes } = await processShow(show, tvdbScraper, history)
      console.log(chalk.green(`\n✅ ${show.name}: Found ${totalEpisodes} episodes (${newEpisodes.length} new)`))
      
      if (newEpisodes.length > 0) {
        // Download new episodes
        console.log(chalk.blue('\n⏳ Starting downloads...\n'))
        const downloader = new Downloader()
        await downloader.init()

        for (const episode of newEpisodes) {
          try {
            await downloader.downloadEpisode(episode)
            await history.markDownloaded(episode)
            console.log(chalk.green(`✅ Downloaded: ${episode.toFileName()}`))
          } catch (error) {
            console.error(chalk.red(`❌ Failed to download ${episode.title}:`, error.message))
          }
        }
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
