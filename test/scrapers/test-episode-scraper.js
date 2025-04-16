require('dotenv').config()
const scrapeEpisodes = require('../../src/services/scraper/nhk-episode-scraper')
const fs = require('fs-extra')
const path = require('path')
const chalk = require('chalk')

async function testEpisodeScraper() {
  try {
    const showUrl = 'https://www3.nhk.or.jp/nhkworld/en/shows/journeys/'
    console.log(chalk.blue('Testing episode scraper with:', showUrl))

    const episodes = await scrapeEpisodes(showUrl)

    console.log(chalk.green(`✅ Found ${episodes.length} episodes`))

    // Save results for verification
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const outputFile = path.join(
      __dirname,
      `../../metadata/episodes_${timestamp}.json`
    )

    await fs.writeJson(
      outputFile, // First argument should be the file path
      {
        // Second argument is the data
        url: showUrl,
        timestamp,
        episodeCount: episodes.length,
        episodes,
      },
      { spaces: 2 } // Third argument is options
    )

    // Show sample
    episodes.slice(0, 3).forEach((ep) => {
      console.log(chalk.gray('\n-------------------'))
      console.log(chalk.gray('Show:'), ep.show)
      console.log(chalk.gray('Title:'), ep.title)
      console.log(chalk.gray('NHK ID:'), ep.nhkId)
      console.log(chalk.gray('URL:'), ep.url)
    })
  } catch (error) {
    console.error(chalk.red('Test failed:'), error)
    process.exit(1)
  }
}

testEpisodeScraper()
