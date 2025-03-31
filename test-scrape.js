const VideoDownloader = require('./src/server/ytdlp-wrapper')
const chalk = require('chalk')

async function testScrape() {
  try {
    const downloader = new VideoDownloader()
    const urls = ['https://www3.nhk.or.jp/nhkworld/en/shows/2007550/']

    for (const url of urls) {
      console.log(chalk.blue(`\n🔍 Testing URL: ${url}`))
      const metadata = await downloader.scrapeShowMetadata(url)
      console.log(chalk.green('Results:'))
      console.log(JSON.stringify(metadata, null, 2))
    }
  } catch (error) {
    console.error(chalk.red('\n❌ Error:'), error.message)
    console.error(chalk.gray('Stack trace:'), error.stack)
  }
}

testScrape()
