require('dotenv').config()
const fs = require('fs-extra')
const path = require('path')
const chalk = require('chalk')

async function findMissingEpisodes(jsonFile) {
  try {
    console.log(chalk.blue('🔍 Checking for missing episodes in:'), jsonFile)

    const data = await fs.readJson(jsonFile)
    const episodes = data.episodes

    // Get range of IDs
    const nhkIds = episodes.map((ep) => parseInt(ep.nhkId))
    const maxId = Math.max(...nhkIds)
    const minId = Math.min(...nhkIds)

    console.log(chalk.gray('ID Range:'), `${minId} - ${maxId}`)

    // Find missing IDs
    const missingIds = []
    for (let i = minId; i <= maxId; i++) {
      if (!nhkIds.includes(i)) {
        missingIds.push(i)
      }
    }

    // Save results
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const outputFile = path.join(
      path.dirname(jsonFile),
      `missing_episodes_${timestamp}.json`
    )

    await fs.writeJson(
      outputFile,
      {
        timestamp,
        totalEpisodes: episodes.length,
        expectedTotal: maxId - minId + 1,
        missingCount: missingIds.length,
        missingIds,
        idRange: {
          min: minId,
          max: maxId,
        },
      },
      { spaces: 2 }
    )

    console.log(
      chalk.green(`✅ Found ${missingIds.length} missing episode IDs`)
    )
    console.log(chalk.gray('Results saved to:'), outputFile)

    // Display first few missing IDs
    if (missingIds.length > 0) {
      console.log(chalk.yellow('\nMissing Episodes:'))
      missingIds.slice(0, 5).forEach((id) => {
        console.log(chalk.gray(`- ${id}`))
      })
      if (missingIds.length > 5) {
        console.log(chalk.gray(`...and ${missingIds.length - 5} more`))
      }
    }
  } catch (error) {
    console.error(
      chalk.red('❌ Failed to check missing episodes:'),
      error.message
    )
    throw error
  }
}

// If run directly, use latest episode scrape file
if (require.main === module) {
  const metadataDir = path.join(__dirname, 'metadata')
  const files = fs
    .readdirSync(metadataDir)
    .filter((f) => f.startsWith('episode_scrape_'))
    .sort()
    .reverse()

  if (files.length > 0) {
    const latestFile = path.join(metadataDir, files[0])
    findMissingEpisodes(latestFile)
  } else {
    console.error(chalk.red('❌ No episode scrape files found'))
  }
}

module.exports = findMissingEpisodes
