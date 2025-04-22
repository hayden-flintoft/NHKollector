// Direct API Access From End Users
// Your project may not have the resources to provide its own API or caching proxy hosting, or you may not wish to deal with the complexities of either system.
// In most cases you may write your app or software such that your users directly access TheTVDB's API.
// You should contact us in advance to negotiate a contract (generally requiring attribution)
// or use a subscriber-supported API key that requires that each of your users has a $12/year TheTVDB subscription.

require('dotenv').config()
const TVDBScraper = require('./src/services/scraper/tvdb-scraper')
const chalk = require('chalk')
const Logger = require('./src/utils/logger')

async function testTVDB() {
  const scraper = new TVDBScraper()

  try {
    console.log(chalk.blue('⏳ Testing TVDB Scraper...'))

    await Logger.init()
    await scraper.init()

    // Test episode search
    const testEpisode = {
      showId: '254957',
      title: 'NIIGATA: SNOW COUNTRY WONDERLAND',
      nhkId: '2007552',
    }

    console.log(chalk.blue(`🔍 Searching for episode: ${testEpisode.title}`))
    const episode = await scraper.findEpisode(testEpisode)

    if (episode) {
      console.log(chalk.green('\n✅ Episode Found:'))
      console.log(chalk.gray('Title:'), episode.title)
      console.log(chalk.gray('Season:'), episode.season)
      console.log(chalk.gray('Episode:'), episode.episode)
      console.log(chalk.gray('Air Date:'), episode.airDate)
      console.log(chalk.gray('ID:'), episode.id)
    } else {
      console.log(chalk.yellow('\n⚠️ No episode found'))
    }

    // Show cache info
    console.log(chalk.blue('\n📂 Cache Info:'))
    console.log(chalk.gray('Location:'), scraper.cacheDir)
  } catch (error) {
    console.error(chalk.red('❌ Test failed:'), error.message)
    console.error(chalk.gray(error.stack))
    process.exit(1)
  }
}

testTVDB().catch((error) => {
  console.error(chalk.red('❌ Unhandled error:'), error)
  process.exit(1)
})
