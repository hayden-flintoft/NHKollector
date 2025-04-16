require('dotenv').config()
const path = require('path')
const fs = require('fs-extra')
const chalk = require('chalk')
const TVDBApi = require('./src/api/tvdb-api')
const enrichEpisodes = require('./src/services/enricher/tvdb-enricher')
const scrapeEpisodes = require('./src/services/scraper/nhk-episode-scraper')
const VideoDownloader = require('./src/server/ytdlp-wrapper')

async function testDownloadEnriched() {
  try {
    // 1. Get episodes from NHK
    const showUrl = 'https://www3.nhk.or.jp/nhkworld/en/shows/journeys/'
    console.log(chalk.blue('🔍 Testing enriched downloads for:', showUrl))

    console.log(chalk.blue('\n1. Getting episode list...'))
    const episodes = await scrapeEpisodes(showUrl)
    console.log(chalk.green(`✅ Found ${episodes.length} episodes`))

    // 2. Enrich with TVDB data
    console.log(chalk.blue('\n2. Enriching with TVDB data...'))
    const tvdbId = '254957' // Journeys in Japan
    const enrichedEpisodes = await enrichEpisodes(episodes, tvdbId)

    // Save enriched data for inspection
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const outputFile = path.join(
      __dirname,
      `metadata/enriched_episodes_${timestamp}.json`
    )

    await fs.writeJson(
      outputFile,
      {
        url: showUrl,
        timestamp,
        episodeCount: enrichedEpisodes.length,
        episodes: enrichedEpisodes,
      },
      { spaces: 2 }
    )

    // 3. Test download for first 2 episodes
    console.log(chalk.blue('\n3. Testing downloads...'))
    const downloader = new VideoDownloader()
    await downloader.init()

    for (const [index, episode] of enrichedEpisodes.slice(0, 2).entries()) {
      try {
        console.log(chalk.blue(`\nDownloading episode ${index + 1}/2:`))
        console.log(chalk.gray('Title:', episode.title))

        // Convert relative URL to absolute URL
        const fullUrl = `https://www3.nhk.or.jp${episode.url}`
        console.log(chalk.gray('URL:', fullUrl))

        if (episode.tvdb) {
          console.log(chalk.gray('TVDB Season:', episode.tvdb.seasonNumber))
          console.log(chalk.gray('TVDB Episode:', episode.tvdb.episodeNumber))
        }

        const result = await downloader.downloadEpisode(fullUrl)
        console.log(chalk.green('✅ Download successful'))
        console.log(chalk.gray('Saved to:', result.filename))
      } catch (error) {
        console.error(chalk.red('❌ Download failed:'), error.message)
      }
    }
  } catch (error) {
    console.error(chalk.red('Test failed:'), error)
    process.exit(1)
  }
}

testDownloadEnriched()
