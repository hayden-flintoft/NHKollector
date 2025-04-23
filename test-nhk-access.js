const axios = require('axios')
const chalk = require('chalk')
const cheerio = require('cheerio')

async function testNHKAccess() {
  try {
    // Test regular show page
    const showUrl = 'https://www3.nhk.or.jp/nhkworld/en/shows/journeys/'
    console.log(chalk.blue('\n1. Testing show page access...'))
    const response = await axios.get(showUrl)

    // Test VOD API endpoint
    const vodUrl =
      'https://www3.nhk.or.jp/nhkworld/data/en/shows/journeys/episodes.json'
    console.log(chalk.blue('\n2. Testing VOD API access...'))
    const vodResponse = await axios.get(vodUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        Accept: 'application/json',
        Referer: showUrl,
      },
    })

    // Parse episode data
    const episodes = vodResponse.data?.episodes || []
    console.log(chalk.green(`\n✅ Found ${episodes.length} episodes`))

    // Show sample of episodes
    episodes.slice(0, 3).forEach((ep) => {
      console.log(chalk.gray('\n-------------------'))
      console.log(chalk.gray('ID:'), ep.pgm_id)
      console.log(chalk.gray('Title:'), ep.title)
      console.log(chalk.gray('Date:'), ep.onair)
      console.log(chalk.gray('Available:'), ep.vod_available)
    })
  } catch (error) {
    console.error(chalk.red('\n❌ Error:'), error.message)
    if (error.response) {
      console.error(chalk.gray('Status:'), error.response.status)
      console.error(chalk.gray('Headers:'), error.response.headers)
    }
  }
}

testNHKAccess()
