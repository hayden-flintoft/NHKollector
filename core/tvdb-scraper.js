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

    // Check cache first
    const cachedResult = this.getCachedEpisode(showSlug, episodeTitle)
    if (cachedResult) {
      console.log(chalk.blue('📎 Found in cache:', cachedResult))
      return cachedResult
    }

    try {
      let seasonsUrl = showUrl.split('#')[0].replace(/\/$/, '')
      if (!seasonsUrl.includes('/allseasons/official')) {
        seasonsUrl = `${seasonsUrl}/allseasons/official`
      }

      console.log(chalk.blue('🔍 TVDB Search Details:'))
      console.log(chalk.gray('URL:', seasonsUrl))
      console.log(chalk.gray('Episode:', episodeTitle))

      // Launch browser with additional options
      this.browser = await puppeteer.launch({
        headless: false,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--window-size=1280,960',
          '--disable-web-security',
          '--disable-features=IsolateOrigins,site-per-process',
          '--allow-running-insecure-content'
        ],
        ignoreHTTPSErrors: true
      })

      const page = await this.browser.newPage()
      
      // Log all console messages
      page.on('console', msg => console.log(chalk.gray(`Browser console: [${msg.type()}] ${msg.text()}`)))
      
      // Log all failed requests
      page.on('requestfailed', request => {
        console.log(chalk.red(`Failed request: ${request.url()}`))
        console.log(chalk.red(`Failure: ${request.failure().errorText}`))
      })

      // Log navigation events
      page.on('load', () => console.log(chalk.gray('Page load event fired')))
      page.on('domcontentloaded', () => console.log(chalk.gray('DOMContentLoaded event fired')))

      await page.setViewport({ width: 1280, height: 960 })
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/113.0.0.0 Safari/537.36')
      
      // Set request interception
      await page.setRequestInterception(true)
      page.on('request', request => {
        // Only allow document, script, xhr, fetch, and stylesheet
        const resourceType = request.resourceType()
        if (['document', 'script', 'xhr', 'fetch', 'stylesheet'].includes(resourceType)) {
          request.continue()
        } else {
          request.abort()
        }
      })

      const timeout = options.timeout || 30000
      console.log(chalk.gray(`⏳ Loading page (timeout: ${timeout}ms)`))
      
      try {
        const response = await page.goto(seasonsUrl, {
          waitUntil: 'networkidle0',
          timeout: timeout
        })

        console.log(chalk.gray(`Response status: ${response.status()}`))
        console.log(chalk.gray(`Response headers:`, await response.headers()))

        // Take screenshot even if response isn't OK
        await page.screenshot({ 
          path: 'debug-tvdb.png',
          fullPage: true
        })

        if (!response.ok()) {
          throw new Error(`Page load failed with status: ${response.status()}`)
        }

        // Check response status
        const status = response.status()
        if (status !== 200) {
          throw new Error(`Page returned status ${status}`)
        }

        // Check if page contains expected content
        const hasContent = await page.evaluate(() => {
          const container = document.querySelector("#app > div.container")
          return !!container
        })

        if (!hasContent) {
          throw new Error('Page loaded but content not found - possible bot detection')
        }

        console.log(chalk.gray('✅ Page loaded successfully'))

        // Search for the episode
        const episodeInfo = await page.evaluate((searchTitle) => {
          const episodeList = document.querySelector("#app > div.container > div.row > div")
          if (!episodeList) return null

          const episodes = episodeList.querySelectorAll('ul > li')
          for (const episode of episodes) {
            const titleElement = episode.querySelector('h4 > a')
            const seasonEpElement = episode.querySelector('h4 > span')
            
            if (titleElement && seasonEpElement) {
              const title = titleElement.textContent.trim()
              const seasonEp = seasonEpElement.textContent.trim()

              // Check for exact match or close match (ignoring case and special characters)
              if (title.toLowerCase() === searchTitle.toLowerCase()) {
                return {
                  title,
                  seasonEpisode: seasonEp
                }
              }
            }
          }
          return null
        }, episodeTitle) // Note: changed from hardcoded value

        if (episodeInfo) {
          console.log(chalk.green(`✅ Found episode: ${episodeInfo.title}`))
          console.log(chalk.gray(`   Season/Episode: ${episodeInfo.seasonEpisode}`))
          
          // Cache the result
          await this.cacheEpisode(showSlug, episodeTitle, episodeInfo.seasonEpisode)
          
          return episodeInfo.seasonEpisode
        } else {
          console.log(chalk.yellow(`⚠️ Episode not found: ${episodeTitle}`))
          return null
        }

      } catch (error) {
        console.error(chalk.red('Navigation error:'), error.message)
        // Take error screenshot
        await page.screenshot({ 
          path: 'error-tvdb.png',
          fullPage: true
        })
        throw error
      }
    } catch (error) {
      console.error(chalk.red('\n❌ Scraping failed:'), error.message)
      return null
    } finally {
      if (this.browser) {
        await this.cleanup()
      }
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