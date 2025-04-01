const fs = require('fs-extra')
const path = require('path')
const chalk = require('chalk')

const debugLog = (msg) => console.log(chalk.gray(`🔍 [DEBUG] ${msg}`))

/**
 * Filters out already downloaded episodes
 * @param {Array} episodes - Array of episode objects
 * @param {string} downloadDir - Path to downloads directory
 * @returns {Promise<Array>} Array of missing episodes
 */
async function filterDownloadedEpisodes(episodes, downloadDir = 'downloads') {
  try {
    debugLog(`Checking ${episodes.length} episodes against downloads`)

    // Ensure logs directory exists
    const logsDir = path.join(__dirname, '../../logs/episode-filter')
    await fs.ensureDir(logsDir)

    // Get list of downloaded files
    const downloadedFiles = await fs.readdir(downloadDir)

    // Filter and log results
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const logFile = path.join(logsDir, `filter-log-${timestamp}.json`)

    const results = episodes.map((episode) => {
      // Check if any files contain this episode's NHK ID
      const isDownloaded = downloadedFiles.some((filename) =>
        filename.includes(episode.nhkId)
      )

      return {
        episode,
        status: isDownloaded ? 'already_downloaded' : 'missing',
        checked: timestamp,
      }
    })

    // Save detailed log
    await fs.writeJson(
      logFile,
      {
        timestamp,
        totalEpisodes: episodes.length,
        downloadedCount: results.filter(
          (r) => r.status === 'already_downloaded'
        ).length,
        missingCount: results.filter((r) => r.status === 'missing').length,
        results,
      },
      { spaces: 2 }
    )

    // Return only missing episodes
    const missingEpisodes = results
      .filter((r) => r.status === 'missing')
      .map((r) => r.episode)

    console.log(
      chalk.green(`✅ Found ${missingEpisodes.length} episodes to download`)
    )
    console.log(chalk.gray('Filter log saved to:'), logFile)

    return missingEpisodes
  } catch (error) {
    console.error(chalk.red('❌ Failed to filter episodes:'), error.message)
    throw error
  }
}

module.exports = filterDownloadedEpisodes
