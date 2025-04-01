const VideoDownloader = require('./src/server/ytdlp-wrapper')
const chalk = require('chalk')
const fs = require('fs').promises
const path = require('path')

async function testDownload() {
  try {
    const downloader = new VideoDownloader()
    // Use the correct VOD URL
    const url = 'https://www3.nhk.or.jp/nhkworld/en/shows/journeys/'

    console.log(chalk.blue('📺 Testing episode list for:', url))
    const episodes = await downloader.getAvailableEpisodes(url)

    console.log(chalk.green(`\n✅ Found ${episodes.length} episodes:`))
    episodes.slice(0, 5).forEach((episode, index) => {
      console.log(chalk.gray('\n-------------------'))
      console.log(chalk.gray('Episode:'), episode.title)
      console.log(chalk.gray('Date:'), episode.date)
      console.log(chalk.gray('URL:'), episode.url)
      if (episode.description) {
        console.log(
          chalk.gray('Description:'),
          episode.description.substring(0, 100) + '...'
        )
      }
    })

    if (episodes.length > 5) {
      console.log(chalk.blue(`\n...and ${episodes.length - 5} more episodes`))
    }
  } catch (error) {
    console.error(chalk.red('❌ Test failed:'), error.message)
    // Save response for debugging
    if (error.response?.data) {
      await fs.writeFile(
        path.join(__dirname, '../debug-error.html'),
        error.response.data
      )
    }
    process.exit(1)
  }
}

testDownload()
