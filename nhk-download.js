#!/usr/bin/env node
const path = require('path')
const fs = require('fs-extra')
const chalk = require('chalk')
const NHKScraper = require('./core/scraper')
const Downloader = require('./core/downloader')
const DownloadHistory = require('./core/download-history')

const SHOWS_CONFIG = path.join(__dirname, 'config', 'shows.json')

async function main() {
  try {
    // Initialize download history
    const history = new DownloadHistory()
    await history.init()

    // Get show URL from command line or config
    let showUrl = process.argv[2]
    if (!showUrl) {
      const shows = await fs.readJson(SHOWS_CONFIG)
      if (!shows || !shows.length) {
        throw new Error('No show URL provided and no shows in config')
      }
      showUrl = shows[0].url
    }

    console.log(chalk.blue('🔍 Getting episodes from:', showUrl))
    const scraper = new NHKScraper()
    const episodes = await scraper.scrapeShowEpisodes(showUrl)
    
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

    for (const episode of newEpisodes) {
      try {
        await downloader.downloadEpisode(episode)
        await history.markDownloaded(episode)
        console.log(chalk.green(`✅ Downloaded: ${episode.title}`))
      } catch (error) {
        console.error(chalk.red(`❌ Failed to download ${episode.title}:`, error.message))
      }
    }

  } catch (error) {
    console.error(chalk.red('❌ Error:', error.message))
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

module.exports = main
