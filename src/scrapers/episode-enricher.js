const TVDBApi = require('../api/tvdb-api')
const fs = require('fs-extra')
const path = require('path')
const chalk = require('chalk')

const debugLog = (msg) => console.log(chalk.gray(`🔍 [DEBUG] ${msg}`))

/**
 * Enriches episodes with TVDB season and episode numbers
 * @param {Array} episodes - Array of NHK episodes
 * @param {string} tvdbId - TVDB series ID
 * @returns {Promise<Array>} Episodes with added TVDB data
 */
async function enrichEpisodes(episodes, tvdbId) {
  try {
    debugLog(`Enriching ${episodes.length} episodes with TVDB data`)

    // Initialize TVDB API and get series info once
    const tvdb = new TVDBApi()
    await tvdb.init()
    const seriesInfo = await tvdb.getSeriesById(tvdbId)

    // Setup logging directory
    const logsDir = path.join(__dirname, '../../logs/episode-enricher')
    await fs.ensureDir(logsDir)
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')

    if (!seriesInfo?.episodes?.length) {
      throw new Error('No episodes found in TVDB data')
    }

    // Process episodes
    const results = []
    const matchLog = []

    for (const [index, episode] of episodes.entries()) {
      // Add detailed debug logging
      debugLog('\n' + '-'.repeat(50))
      debugLog(`Processing episode ${index + 1}/${episodes.length}:`)
      debugLog(`  Show: ${episode.show}`)
      debugLog(`  NHK ID: ${episode.nhkId}`)
      debugLog(`  Title: ${episode.title}`)

      const match = await tvdb.findEpisodeFromScrapedData({
        show: episode.show,
        episode: episode.title,
        airDate: null,
      })

      if (match) {
        debugLog(
          chalk.green(
            `  ✓ TVDB Match found: S${match.episode.seasonNumber}E${match.episode.number}`
          )
        )
        debugLog(`    TVDB Title: ${match.episode.name}`)
      } else {
        debugLog(chalk.yellow(`  ⚠ No TVDB match found`))
      }

      const enrichedEpisode = {
        ...episode,
        tvdb: match
          ? {
              seasonNumber: match.episode.seasonNumber,
              episodeNumber: match.episode.number,
              title: match.episode.name,
              aired: match.episode.aired,
              filename: match.filename,
            }
          : null,
      }

      results.push(enrichedEpisode)
      matchLog.push({
        nhkId: episode.nhkId,
        nhkTitle: episode.title,
        matched: !!match,
        tvdbData: match
          ? {
              seasonNumber: match.episode.seasonNumber,
              episodeNumber: match.episode.number,
              title: match.episode.name,
            }
          : null,
      })
    }

    // Save matching results
    await fs.writeJson(
      path.join(logsDir, `matching-log-${timestamp}.json`),
      {
        timestamp,
        tvdbId,
        totalEpisodes: episodes.length,
        matchedCount: matchLog.filter((l) => l.matched).length,
        matchLog,
      },
      { spaces: 2 }
    )

    console.log(
      chalk.green(`✅ Enriched ${results.length} episodes with TVDB data`)
    )
    return results
  } catch (error) {
    console.error(chalk.red('❌ Failed to enrich episodes:'), error.message)
    throw error
  }
}

module.exports = enrichEpisodes
