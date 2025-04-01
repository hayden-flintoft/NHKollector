const ShowManager = require('./src/server/show-manager')
const chalk = require('chalk')

async function testShowManager() {
  try {
    console.log(chalk.blue('⏳ Testing Show Manager...'))

    const manager = new ShowManager()
    await manager.init()

    // Clean any existing duplicates
    await manager.cleanDuplicates()

    // Add a test show
    const testShow = {
      nhkId: 2007550,
      name: 'Journeys in Japan',
      url: 'https://www3.nhk.or.jp/nhkworld/en/shows/journeys/',
      tvdbId: 254957,
      metadata: {
        network: 'NHK World',
        language: 'eng',
        country: 'jpn',
      },
    }

    // Try to add the same show twice
    console.log(chalk.blue('\n📝 Adding show first time:'))
    await manager.addShow(testShow)

    console.log(chalk.blue('\n📝 Attempting to add duplicate:'))
    await manager.addShow(testShow)

    // List all shows
    const shows = manager.getShows()
    console.log(chalk.green('\n📺 Current Shows:'))
    console.log(chalk.gray(`Total shows: ${shows.length}`))
    shows.forEach((show) => {
      console.log(chalk.gray('-------------------'))
      console.log(chalk.gray('Name:'), show.name)
      console.log(chalk.gray('TVDB ID:'), show.tvdbId)
      console.log(chalk.gray('NHK ID:'), show.nhkId)
      console.log(chalk.gray('URL:'), show.url)
      console.log(chalk.gray('Enabled:'), show.enabled)
    })
  } catch (error) {
    console.error(chalk.red('❌ Test failed:'), error.message)
  }
}

testShowManager()
