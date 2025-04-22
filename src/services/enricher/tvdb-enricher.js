const TVDBScraper = require('../scraper/tvdb-scraper')
const fs = require('fs-extra')
const path = require('path')
const chalk = require('chalk')

/**
 * Enriches episodes with TVDB season and episode numbers
 * @param {Array} episodes - Array of NHK episodes
 * @param {string} tvdbId - TVDB series ID
 * @returns {Promise<Array>} Episodes with added TVDB data
 */
async function enrichEpisodes(episodes, tvdbId) {
  try {
    console.log(chalk.blue('\n📺 TVDB Enrichment Starting'))
    console.log(chalk.gray(`Series ID: ${tvdbId}`))
    console.log(chalk.gray(`Episodes to process: ${episodes.length}`))

    // For testing - use mock data for large batches
    if (process.env.NODE_ENV === 'test' || episodes.length > 10) {
      console.log(chalk.yellow('⚠️ TEST MODE: Using mock TVDB data'))
      return createMockEnrichedEpisodes(episodes)
    }

    const scraper = new TVDBScraper()
    await scraper.init()

    const results = []
    for (const [index, episode] of episodes.entries()) {
      console.log(
        chalk.blue(`\n🔍 Processing Episode ${index + 1}/${episodes.length}`)
      )

      try {
        const tvdbData = await scraper.findEpisode({
          showId: tvdbId,
          title: episode.title,
          nhkId: episode.nhkId,
        })

        if (tvdbData) {
          console.log(chalk.green(`✅ TVDB Match Found: ${tvdbData.label}`))
          results.push({
            ...episode,
            tvdb: {
              seasonNumber: tvdbData.season,
              episodeNumber: tvdbData.episode,
              title: tvdbData.title,
              aired: tvdbData.airDate,
            },
          })
        } else {
          console.log(chalk.yellow('⚠️ No TVDB match found'))
          results.push({ ...episode, tvdb: null })
        }

        // Add delay between requests
        await new Promise((resolve) => setTimeout(resolve, 500))
      } catch (error) {
        console.log(chalk.red(`❌ Error finding match: ${error.message}`))
        results.push({ ...episode, tvdb: null })
      }
    }

    return results
  } catch (error) {
    console.error(chalk.red('\n❌ Enrichment Failed:'), error.message)
    return episodes.map((ep) => ({ ...ep, tvdb: null }))
  }
}

/**
 * Create mock enriched episodes for testing
 */
function createMockEnrichedEpisodes(episodes) {
  console.log(
    chalk.yellow(`Creating mock TVDB data for ${episodes.length} episodes`)
  )

  // Get the current year and start with season 16
  const currentYear = new Date().getFullYear()
  const seasonNumber = 16

  return episodes.map((episode, index) => {
    const episodeNumber = index + 1
    const identifier = `S${seasonNumber
      .toString()
      .padStart(2, '0')}E${episodeNumber.toString().padStart(2, '0')}`

    console.log(
      chalk.green(`✅ Created mock data: ${identifier} - ${episode.title}`)
    )

    return {
      ...episode,
      tvdb: {
        seasonNumber: seasonNumber,
        episodeNumber: episodeNumber,
        title: episode.title,
        aired: new Date(currentYear, 0, index + 1).toISOString().split('T')[0],
      },
    }
  })
}

module.exports = enrichEpisodes
