require('dotenv').config()
const scrapeEpisodes = require('../../src/services/scraper/nhk-episode-scraper')
const enrichEpisodes = require('../../src/services/enricher/tvdb-enricher')
const chalk = require('chalk')

async function testEpisodeEnricher() {
  try {
    // First get episodes from NHK
    const showUrl = 'https://www3.nhk.or.jp/nhkworld/en/shows/journeys/'
    console.log(chalk.blue('1. Getting episodes from:', showUrl))
    const episodes = await scrapeEpisodes(showUrl)

    // Enrich with TVDB data
    const tvdbId = 254957 // Journeys in Japan - use number instead of string
    console.log(chalk.blue('\n2. Enriching episodes with TVDB data'))
    const enrichedEpisodes = await enrichEpisodes(episodes, tvdbId)

    // Show results
    console.log(chalk.blue('\n3. Sample Results:'))
    enrichedEpisodes.slice(0, 3).forEach((ep) => {
      console.log(chalk.gray('\n-------------------'))
      console.log(chalk.gray('Title:'), ep.title)
      console.log(chalk.gray('NHK ID:'), ep.nhkId)
      if (ep.tvdb) {
        console.log(chalk.green('✓ TVDB Match Found:'))
        console.log(chalk.gray('  Season:'), ep.tvdb.seasonNumber)
        console.log(chalk.gray('  Episode:'), ep.tvdb.episodeNumber)
        console.log(chalk.gray('  TVDB Title:'), ep.tvdb.title)
      } else {
        console.log(chalk.yellow('⚠ No TVDB Match'))
      }
    })
  } catch (error) {
    console.error(chalk.red('Test failed:'), error)
    process.exit(1)
  }
}

testEpisodeEnricher()
