const puppeteer = require('puppeteer')
const chalk = require('chalk')
const fs = require('fs-extra')
const path = require('path')

async function getAllEpisodeHeadings(url) {
  const cacheFile = path.join(process.cwd(), 'data', 'tvdb-cache.json')
  let browser = null
  
  try {
    // Ensure cache structure exists
    await fs.ensureFile(cacheFile)
    const cache = await fs.readJSON(cacheFile).catch(() => ({ episodes: {} }))
    
    // Extract show slug from URL
    const showSlug = url.match(/series\/([^/#]+)/)?.[1]
    if (!showSlug) {
      throw new Error('Invalid show URL')
    }

    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })

    const page = await browser.newPage()
    
    console.log(chalk.gray('⏳ Loading page...'))
    await page.goto(url, { waitUntil: 'domcontentloaded' })
    
    const episodes = await page.evaluate(() => {
      const elements = document.querySelectorAll('h4.list-group-item-heading')
      return Array.from(elements)
        .map(h4 => {
          const title = h4.querySelector('a')?.textContent.trim()
          const seasonEp = h4.querySelector('span')?.textContent.trim()
          if (!title || !seasonEp) return null
          return { seasonEp, title }
        })
        .filter(Boolean)
    })

    if (episodes.length > 0) {
      // Update cache
      if (!cache.episodes[showSlug]) {
        cache.episodes[showSlug] = {}
      }
      
      // Add all episodes to cache
      episodes.forEach(ep => {
        cache.episodes[showSlug][ep.title] = ep.seasonEp
      })

      // Save updated cache
      await fs.writeJSON(cacheFile, cache, { spaces: 2 })
      console.log(chalk.green(`\n✅ Cached ${episodes.length} episodes for ${showSlug}`))
      
      // Display table output
      const maxLength = Math.max(...episodes.map(ep => ep.title.length))
      console.log(chalk.blue('\n📺 Episodes List:'))
      console.log(chalk.gray('─'.repeat(maxLength + 15)))
      console.log(chalk.white(`Episode │ Title`))
      console.log(chalk.gray('─'.repeat(maxLength + 15)))
      
      episodes
        .sort((a, b) => {
          const [aS, aE] = a.seasonEp.match(/S(\d+)E(\d+)/).slice(1).map(Number)
          const [bS, bE] = b.seasonEp.match(/S(\d+)E(\d+)/).slice(1).map(Number)
          return aS === bS ? aE - bE : aS - bS
        })
        .forEach(ep => {
          const paddedTitle = ep.title.padEnd(maxLength)
          console.log(chalk.gray(`${ep.seasonEp} │ ${paddedTitle}`))
        })
        
      console.log(chalk.gray('─'.repeat(maxLength + 15)))
    } else {
      console.log(chalk.yellow('\nNo episodes found'))
    }

    return episodes

  } catch (error) {
    console.error(chalk.red('Error:'), error.message)
    return []
  } finally {
    if (browser) await browser.close()
  }
}

async function getEpisodeFromCache(episodeTitle, showSlug = 'journeys-in-japan') {
  try {
    const cacheFile = path.join(process.cwd(), 'data', 'tvdb-cache.json')
    
    // Check if cache exists
    if (!await fs.pathExists(cacheFile)) {
      console.log(chalk.yellow('Cache file not found'))
      return null
    }

    // Read cache
    const cache = await fs.readJSON(cacheFile)
    
    // Check if show exists in cache
    if (!cache.episodes?.[showSlug]) {
      console.log(chalk.yellow(`No cached episodes for ${showSlug}`))
      return null
    }

    // Look for exact match
    const seasonEp = cache.episodes[showSlug][episodeTitle]
    if (seasonEp) {
      console.log(chalk.blue('📎 Found in cache:', seasonEp))
      return seasonEp
    }

    // If no exact match, try normalized comparison
    const normalize = str => str.toLowerCase().trim()
      .replace(/[^a-z0-9:\-\s]/g, '')
      .replace(/\s+/g, ' ')

    const normalizedTitle = normalize(episodeTitle)
    const entries = Object.entries(cache.episodes[showSlug])
    
    for (const [title, seasonEp] of entries) {
      if (normalize(title) === normalizedTitle) {
        console.log(chalk.blue('📎 Found in cache (normalized):', seasonEp))
        return seasonEp
      }
    }

    console.log(chalk.yellow('Episode not found in cache'))
    return null

  } catch (error) {
    console.error(chalk.red('Cache error:'), error.message)
    return null
  }
}

async function updateCache(url = 'https://thetvdb.com/series/journeys-in-japan/allseasons/official') {
  console.log(chalk.blue('🔄 Checking for new episodes...'))
  
  try {
    // Get current cache
    const cacheFile = path.join(process.cwd(), 'data', 'tvdb-cache.json')
    await fs.ensureFile(cacheFile)
    const cache = await fs.readJSON(cacheFile).catch(() => ({ episodes: {} }))
    
    // Extract show slug
    const showSlug = url.match(/series\/([^/#]+)/)?.[1]
    if (!showSlug) {
      throw new Error('Invalid show URL')
    }
    
    // Get current episode count
    const currentCount = Object.keys(cache.episodes[showSlug] || {}).length
    
    // Fetch latest episodes
    const episodes = await getAllEpisodeHeadings(url)
    
    if (episodes.length === 0) {
      console.log(chalk.yellow('No episodes found to update'))
      return false
    }
    
    // Initialize show in cache if needed
    if (!cache.episodes[showSlug]) {
      cache.episodes[showSlug] = {}
    }
    
    // Track new episodes
    let newEpisodes = 0
    
    // Update cache with new episodes
    episodes.forEach(ep => {
      if (!cache.episodes[showSlug][ep.title]) {
        cache.episodes[showSlug][ep.title] = ep.seasonEp
        newEpisodes++
        console.log(chalk.green(`➕ Added: ${ep.seasonEp} - ${ep.title}`))
      }
    })
    
    // Save if changes were made
    if (newEpisodes > 0) {
      await fs.writeJSON(cacheFile, cache, { spaces: 2 })
      console.log(chalk.green(`\n✅ Added ${newEpisodes} new episodes to cache`))
      return true
    }
    
    console.log(chalk.blue('📎 Cache is up to date'))
    return false
    
  } catch (error) {
    console.error(chalk.red('Update error:'), error.message)
    return false
  }
}

// Example usage
if (require.main === module) {
  const testEpisode = 'Hida: Deep Winter Escape'
  
  // Test cache lookup first, then update if needed
  getEpisodeFromCache(testEpisode)
    .then(result => {
      if (!result) {
        return updateCache()
      }
    })
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error)
      process.exit(1)
    })
}

module.exports = {
  getAllEpisodeHeadings,
  getEpisodeFromCache,
  updateCache
}