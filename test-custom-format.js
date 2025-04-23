const chalk = require('chalk')
const scrapeEpisodes = require('./src/services/scraper/nhk-episode-scraper')

async function testCustomFormat() {
  // Mock show data as it would appear in Sonarr
  const show = {
    title: 'Journeys in Japan',
    customFormats: [
      {
        name: 'NHK-Show-URL',
        specifications: [
          {
            name: 'Slug',
            value:
              '{NHK_URL=https://www3.nhk.or.jp/nhkworld/en/shows/journeys/}',
          },
        ],
      },
    ],
    tags: [{ label: 'NHK' }],
  }

  try {
    console.log(chalk.blue('\nTesting Custom Format Configuration:'))
    console.log(chalk.gray('Show Title:'), show.title)
    console.log(chalk.gray('Custom Format:'), show.customFormats[0].name)
    console.log(
      chalk.gray('URL Pattern:'),
      show.customFormats[0].specifications[0].value
    )

    // Test URL extraction
    console.log(chalk.blue('\nTesting URL extraction:'))
    const episodes = await scrapeEpisodes(show)

    if (episodes && episodes.length > 0) {
      console.log(
        chalk.green(`✅ Successfully found ${episodes.length} episodes`)
      )
      console.log('\nFirst episode:')
      console.log(chalk.gray('Title:'), episodes[0].title)
      console.log(chalk.gray('URL:'), episodes[0].url)
    } else {
      console.log(chalk.red('❌ No episodes found'))
    }
  } catch (error) {
    console.error(chalk.red('\n❌ Test failed:'), error.message)
  }
}

// Run test and handle promise
testCustomFormat().catch((error) => {
  console.error(chalk.red('Unhandled error:'), error)
  process.exit(1)
})
