const scrapeEpisodes = require('./src/services/scraper/nhk-episode-scraper')
const chalk = require('chalk')

async function testScraper() {
  // Mock Sonarr show data using Release Profile approach
  const mockShow = {
    title: 'Journeys in Japan',
    releaseProfile: {
      mustContain:
        '{NHK_URL=https://www3.nhk.or.jp/nhkworld/en/shows/journeys/}',
    },
    tags: [{ label: 'NHK' }],
  }

  try {
    const episodes = await scrapeEpisodes(mockShow)
    console.log(chalk.green(`✅ Found ${episodes.length} episodes`))

    episodes.slice(0, 3).forEach((ep) => {
      console.log(chalk.gray('\n-------------------'))
      console.log(chalk.gray('Title:'), ep.title)
      console.log(chalk.gray('ID:'), ep.nhkId)
      console.log(chalk.gray('URL:'), ep.url)
    })
  } catch (error) {
    console.error(chalk.red('❌ Test failed:'), error.message)
    if (error.stack) {
      console.error(chalk.gray(error.stack))
    }
  }
}

testScraper()
