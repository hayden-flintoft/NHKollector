process.env.NODE_ENV = 'test' // Set test mode
require('dotenv').config()
const ShowManager = require('../../src/services/show/show-manager')
const scrapeEpisodes = require('../../src/services/scraper/nhk-episode-scraper')
const enrichEpisodes = require('../../src/services/enricher/tvdb-enricher')
const Downloader = require('../../src/services/download/downloader')
const path = require('path')
const fs = require('fs-extra')
const assert = require('assert')
const chalk = require('chalk')
const Episode = require('../../src/models/Episode')

describe('Download Flow Integration', function () {
  let showManager
  let downloader
  const downloadDir = path.join(__dirname, '../../downloads/test')

  // Increase timeout to 5 minutes
  this.timeout(300000)

  beforeEach(async () => {
    // Setup clean test environment
    await fs.ensureDir(downloadDir)
    showManager = new ShowManager()
    downloader = new Downloader({ downloadDir })
    await showManager.init()
  })

  it('should download and name first 3 episodes correctly', async function () {
    // Set test-specific timeout and add periodic status updates
    this.timeout(300000)
    const testStartTime = Date.now()

    const statusInterval = setInterval(() => {
      const elapsedSeconds = Math.round((Date.now() - testStartTime) / 1000)
      console.log(chalk.gray(`Test running for ${elapsedSeconds} seconds...`))
    }, 30000) // Log every 30 seconds

    try {
      // 1. Get show details with logging
      console.log(chalk.blue('\n📺 Getting Show Configuration'))
      const show = showManager.getShow('2007550') // Journeys in Japan
      assert(show, 'Show not found')
      console.log(chalk.gray('Show Name:', show.name))
      console.log(chalk.gray('NHK ID:', show.nhkId))
      console.log(chalk.gray('TVDB ID:', show.tvdbId))

      // 2. Get episodes list
      console.log(chalk.blue('\n2. Scraping episodes'))
      const episodes = await scrapeEpisodes(show.url)
      assert(episodes.length > 0, 'No episodes found')
      console.log(chalk.gray('Episodes found:'), episodes.length)

      // 3. Enrich with TVDB data
      console.log(chalk.blue('\n3. Enriching with TVDB data'))
      const enrichedEpisodes = await enrichEpisodes(episodes, show.tvdbId)
      assert(enrichedEpisodes.length > 0, 'No episodes enriched')

      // 4. Download first 3 episodes
      console.log(chalk.blue('\n4. Downloading first 3 episodes'))
      const downloadResults = []

      for (const episodeData of enrichedEpisodes.slice(0, 3)) {
        // Create proper Episode instance
        const episode = new Episode(episodeData)
        console.log(chalk.gray('\nDownloading:'), episode.title)

        const result = await downloader.downloadEpisode(episode)
        downloadResults.push(result)

        // Verify file exists
        const expectedPath = path.join(downloadDir, episode.toFileName())
        const exists = await fs.pathExists(expectedPath)
        assert(exists, `File not found: ${expectedPath}`)
      }

      // Verify all downloads succeeded
      assert(
        downloadResults.every((r) => r.success),
        'Some downloads failed'
      )
      console.log(chalk.green('\n✅ All downloads completed successfully'))
    } catch (error) {
      console.error(chalk.red('\n❌ Test failed:'), error)
      throw error
    } finally {
      clearInterval(statusInterval)
    }
  })

  afterEach(async () => {
    // Cleanup downloaded files
    await fs.remove(downloadDir)
  })
})
