// Direct API Access From End Users
// Your project may not have the resources to provide its own API or caching proxy hosting, or you may not wish to deal with the complexities of either system.
// In most cases you may write your app or software such that your users directly access TheTVDB's API.
// You should contact us in advance to negotiate a contract (generally requiring attribution)
// or use a subscriber-supported API key that requires that each of your users has a $12/year TheTVDB subscription.

require('dotenv').config()
const TVDBApi = require('./src/api/tvdb-api')
const chalk = require('chalk')

async function testTVDB() {
  try {
    console.log(chalk.blue('⏳ Testing TVDB API...'))

    const tvdb = new TVDBApi()
    await tvdb.init()

    // Test series info fetch
    const seriesId = 254957 // Journeys in Japan
    console.log(chalk.blue(`📺 Fetching info for series ${seriesId}`))

    const seriesInfo = await tvdb.getSeriesById(seriesId)

    console.log(chalk.green('\n✅ Series Information:'))
    console.log(chalk.gray('Name:'), seriesInfo.name)
    console.log(chalk.gray('First Aired:'), seriesInfo.firstAired)
    console.log(chalk.gray('Status:'), seriesInfo.status?.name)
    console.log(chalk.gray('Episodes:'), seriesInfo.episodes?.length || 0)

    // Display latest episode info if available
    if (seriesInfo.episodes?.length > 0) {
      const latest = seriesInfo.episodes[seriesInfo.episodes.length - 1]
      console.log(chalk.blue('\n📺 Latest Episode:'))
      console.log(chalk.gray('Name:'), latest.name)
      console.log(chalk.gray('Aired:'), latest.aired)
      console.log(chalk.gray('Season:'), latest.seasonNumber)
      console.log(chalk.gray('Episode:'), latest.number)
    }

    // Save debugging info
    console.log(chalk.blue('\n🔍 Debug Info:'))
    console.log(chalk.gray('Data Location:'), tvdb.showDataFile)
  } catch (error) {
    console.error(chalk.red('❌ Test failed:'), error.message)
    if (error.response?.data) {
      console.error(
        chalk.gray('Error details:'),
        JSON.stringify(error.response.data, null, 2)
      )
    }
  }
}

testTVDB()
