const puppeteer = require('puppeteer')
const chalk = require('chalk')
const fs = require('fs-extra')
const path = require('path')

class TVDBScraper {
  constructor() {
    this.cacheFile = path.join(process.cwd(), 'data', 'tvdb-cache.json')
    this.cache = { episodes: {} }
    this.browser = null
  }

  async init() {
    await fs.ensureDir(path.dirname(this.cacheFile))
    try {
      this.cache = await fs.readJSON(this.cacheFile)
    } catch (error) {
      await this.saveCache() // Create new cache file if doesn't exist
    }
  }

  async saveCache() {
    await fs.writeJSON(this.cacheFile, this.cache, { spaces: 2 })
  }

  getShowSlug(url) {
    const match = url.match(/series\/([^/#]+)/)
    return match ? match[1] : null
  }

  getCachedEpisode(showSlug, episodeTitle) {
    return this.cache.episodes[showSlug]?.[episodeTitle] || null
  }

  async cacheEpisode(showSlug, episodeTitle, seasonEpisode) {
    if (!this.cache.episodes[showSlug]) {
      this.cache.episodes[showSlug] = {}
    }
    this.cache.episodes[showSlug][episodeTitle] = seasonEpisode
    await this.saveCache()
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close()
      this.browser = null
    }
  }

  async findEpisodeInfo(showUrl, episodeTitle, options = {}) {
    await this.init()
    const showSlug = this.getShowSlug(showUrl)
    if (!showSlug) {
      console.error(chalk.red('Invalid show URL format'))
      return null
    }

    let page = null
    try {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--window-size=1920,1080'
        ],
        defaultViewport: {
          width: 1920,
          height: 1080
        }
      })

      page = await this.browser.newPage()
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36')

      // Always use the allseasons/official page for scraping
      let url = showUrl
      if (!url.endsWith('/allseasons/official')) {
        url = url.replace(/(\/)?$/, '/allseasons/official')
      }

      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: options.timeout || 60000 })
      await page.waitForSelector('h4.list-group-item-heading', { timeout: 20000 })

      // Extract all episodes
      const episodes = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('h4.list-group-item-heading')).map(h4 => {
          const title = h4.querySelector('a')?.textContent.trim()
          const seasonEp = h4.querySelector('span')?.textContent.trim()
          return { seasonEp, title }
        }).filter(ep => ep.title && ep.seasonEp)
      })

      // Try to find the requested episode
      const normalize = str => str.toLowerCase().trim().replace(/[^a-z0-9:\-\s]/g, '').replace(/\s+/g, ' ')
      const found = episodes.find(ep => normalize(ep.title) === normalize(episodeTitle))

      if (found) {
        console.log(chalk.green(`✅ Found episode: ${found.title}`))
        console.log(chalk.gray(`   Season/Episode: ${found.seasonEp}`))
        await this.cacheEpisode(showSlug, episodeTitle, found.seasonEp)
        return found.seasonEp
      } else {
        console.log(chalk.yellow('\n🔍 No exact match found'))
        console.log(chalk.gray(`Searched for: "${episodeTitle}"`))
        console.log(chalk.blue('\n📺 Available episodes:'))
        episodes.forEach(ep => {
          console.log(chalk.gray(`${ep.seasonEp} - ${ep.title}`))
        })
        return null
      }
    } catch (error) {
      console.error(chalk.red('Scraping error:'), error.message)
      throw error
    } finally {
      if (page) await page.close().catch(() => {})
      if (this.browser) await this.cleanup()
    }
  }
}

module.exports = TVDBScraper

// Example usage:
// const scraper = new TVDBScraper()
// scraper.findEpisodeInfo(
//   'https://thetvdb.com/series/journeys-in-japan',
//   'Hida: Deep Winter Escape'
// )