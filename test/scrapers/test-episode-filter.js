require('dotenv').config()
const scrapeEpisodes = require('../../src/scrapers/episode-scraper')
const filterDownloadedEpisodes = require('../../src/scrapers/episode-filter')
const path = require('path')
const chalk = require('chalk')

async function testEpisodeFilter() {
  try {
    // First get episodes
    const showUrl = 'https://www3.nhk.or.jp/nhkworld/en/shows/journeys/'
    console.log(chalk.blue('1. Getting episodes from:', showUrl))
    const episodes = await scrapeEpisodes(showUrl)

    // Filter downloaded episodes
    console.log(chalk.blue('\n2. Filtering downloaded episodes'))
    const downloadDir = path.join(__dirname, '../../downloads')
    const missingEpisodes = await filterDownloadedEpisodes(
      episodes,
      downloadDir
    )

    // Show results
    console.log(chalk.blue('\n3. Missing Episodes:'))
    missingEpisodes.slice(0, 5).forEach((ep) => {
      console.log(chalk.gray('\n-------------------'))
      console.log(chalk.gray('Title:'), ep.title)
      console.log(chalk.gray('NHK ID:'), ep.nhkId)
      console.log(chalk.gray('URL:'), ep.url)
    })

    if (missingEpisodes.length > 5) {
      console.log(chalk.gray(`\n...and ${missingEpisodes.length - 5} more`))
    }
  } catch (error) {
    console.error(chalk.red('Test failed:'), error)
    process.exit(1)
  }
}

testEpisodeFilter()
