#!/usr/bin/env node
require('dotenv').config()
const NHKScraper = require('./src/services/nhk-scraper')
const Downloader = require('./src/services/downloader')
const chalk = require('chalk')

async function main() {
  const url = process.argv[2]
  if (!url) {
    console.error(chalk.red('Please provide an NHK episode URL'))
    process.exit(1)
  }

  try {
    console.log(chalk.blue('🔍 Fetching episode information...'))
    const scraper = new NHKScraper()
    const episode = await scraper.scrapeEpisode(url)

    console.log(chalk.gray('Show:', episode.showTitle))
    console.log(chalk.gray('Episode:', episode.episodeTitle))
    console.log(chalk.gray('Air Date:', episode.airDate))

    console.log(chalk.blue('\n📥 Starting download...'))
    const downloader = new Downloader()
    await downloader.init()
    const result = await downloader.downloadEpisode(episode)

    console.log(chalk.green('\n✅ Download complete!'))
    console.log(chalk.gray('Saved to:', result.path))
  } catch (error) {
    console.error(chalk.red('❌ Error:', error.message))
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}