#!/usr/bin/env node
const TVDBScraper = require('./core/tvdb-scraper')
const chalk = require('chalk')

async function main() {
  const showUrl = 'https://thetvdb.com/series/journeys-in-japan'
  const episodeTitleCached = 'Hida: Deep Winter Escape'
  const episodeTitleNew = 'Toyama City, Toyama'
  const scraper = new TVDBScraper()
  
  try {
    // Test cached episode
    console.log(chalk.blue('\n🔍 Testing cached episode:'))
    console.log(chalk.gray('Episode:', episodeTitleCached))
    const cachedResult = await scraper.findEpisodeInfo(showUrl, episodeTitleCached)
    
    // Test uncached episode
    console.log(chalk.blue('\n🔍 Testing new episode:'))
    console.log(chalk.gray('Episode:', episodeTitleNew))
    const newResult = await scraper.findEpisodeInfo(showUrl, episodeTitleNew, {
      timeout: 30000  // Allow more time for uncached lookup
    })

    // Display results
    console.log(chalk.blue('\n📝 Results:'))
    
    if (cachedResult) {
      console.log(chalk.green(`✅ Cached episode found: ${episodeTitleCached}`))
      console.log(chalk.gray(`   Season/Episode: ${cachedResult}`))
    }
    
    if (newResult) {
      console.log(chalk.green(`✅ New episode found: ${episodeTitleNew}`))
      console.log(chalk.gray(`   Season/Episode: ${newResult}`))
    }
    
    if (!cachedResult && !newResult) {
      console.log(chalk.yellow('⚠️ No episodes found'))
    }

  } catch (error) {
    console.error(chalk.red('\n❌ Test failed:'), error.message)
    if (error.stack) {
      console.error(chalk.gray('Stack trace:', error.stack))
    }
  } finally {
    if (scraper.cleanup) {
      await scraper.cleanup()
    }
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error(chalk.red('Fatal error:'), error)
    process.exit(1)
  })
}