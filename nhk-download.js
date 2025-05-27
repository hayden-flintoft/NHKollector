#!/usr/bin/env node
const path = require('path')
const fs = require('fs-extra')
const chalk = require('chalk')
const NHKScraper = require('./core/scraper')
const Downloader = require('./core/downloader')

const SHOWS_CONFIG = path.join(__dirname, 'config', 'shows.json')

async function main() {
  try {
    // Get show URL from command line or config
    let showUrl = process.argv[2]
    if (!showUrl) {
      const shows = await fs.readJson(SHOWS_CONFIG)
      if (!shows || !shows.length) {
        throw new Error('No show URL provided and no shows in config')
      }
      showUrl = shows[0].url // Use first show in config
    }

    console.log(chalk.blue('🔍 Getting episodes from:', showUrl))
    const scraper = new NHKScraper()
    const episodes = await scraper.scrapeShowEpisodes(showUrl)
    
    console.log(chalk.blue('📺 Show Information:'))
    console.log(chalk.blue('Show Title:', episodes[0]?.show || 'Unknown'))
    console.log(chalk.blue('\n📝 Found Episodes:'))
    episodes.forEach(episode => {
      console.log(chalk.blue(`${episode.title} (${episode.airDate})`))
    })

    console.log(chalk.green(`\n✅ Found ${episodes.length} episodes total`))
    console.log(chalk.blue('\n⏳ Starting downloads...\n'))

    const downloader = new Downloader()
    await downloader.init()

    for (const episode of episodes) {
      try {
        await downloader.downloadEpisode(episode)
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
