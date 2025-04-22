const puppeteer = require('puppeteer')
const fs = require('fs-extra')
const path = require('path')
const chalk = require('chalk')
const Logger = require('../../utils/logger')

class TVDBScraper {
  constructor() {
    this.cacheDir = path.join(__dirname, '../../../data/tvdb/cache')
    this.showsDir = path.join(this.cacheDir, 'shows')
    this.seasonsDir = path.join(this.cacheDir, 'seasons')
    this.episodesDir = path.join(this.cacheDir, 'episodes')
  }

  async init() {
    await fs.ensureDir(this.showsDir)
    await fs.ensureDir(this.seasonsDir)
    await fs.ensureDir(this.episodesDir)
  }

  async findEpisode({ showId, title, nhkId }) {
    try {
      Logger.info('tvdb', `Looking for episode: ${title} (NHK ID: ${nhkId})`)

      // Check if we have cached episode data first
      const cachedData = await this._checkCache(showId)
      if (cachedData) {
        const match = this._findInCache(cachedData, title)
        if (match) {
          Logger.debug('tvdb', 'Found episode in cache')
          return match
        }
      }

      // Not in cache, need to scrape
      Logger.info('tvdb', 'Episode not in cache, scraping TVDB...')
      const episodes = await this._scrapeAllEpisodes(showId)
      if (!episodes || episodes.length === 0) {
        throw new Error('No episodes found on TVDB')
      }

      // Bottom-up search through episodes
      const match = this._findInEpisodes(episodes.reverse(), title)
      if (!match) {
        throw new Error(`Episode "${title}" not found on TVDB`)
      }

      // Cache the results
      await this._cacheResults(showId, episodes)

      return match
    } catch (err) {
      const error = new Error(`TVDB Scraper Error: ${err.message}`)
      error.stack = err.stack
      throw error
    }
  }

  async _scrapeAllEpisodes(showId) {
    let browser
    try {
      browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      })

      const page = await browser.newPage()
      const url = `https://thetvdb.com/series/journeys-in-japan/allseasons/official`

      await page.goto(url, {
        waitUntil: 'networkidle0',
        timeout: 30000,
      })

      // Wait for episode list to load
      await page.waitForSelector('.list-group-item', { timeout: 5000 })

      // Extract episodes using the provided selectors
      const episodes = await page.evaluate(() => {
        const items = []
        const episodeItems = document.querySelectorAll('.list-group-item')

        episodeItems.forEach((item) => {
          const header = item.querySelector('.list-group-item-heading')
          const label = header?.querySelector('.text-muted')?.textContent
          const title = header?.querySelector('a')?.textContent
          const link = header?.querySelector('a')?.href
          const [airDate] =
            item.querySelector('.list-inline')?.textContent.split('|') || []
          const description = item.querySelector(
            '.list-group-item-text p'
          )?.textContent

          if (label && title) {
            const [season, episode] =
              label.match(/S(\d+)E(\d+)/)?.slice(1) || []
            items.push({
              season: parseInt(season, 10),
              episode: parseInt(episode, 10),
              label,
              title: title.trim(),
              airDate: airDate?.trim(),
              description: description?.trim(),
              link,
              id: link?.split('/').pop(),
            })
          }
        })
        return items
      })

      return episodes
    } catch (err) {
      throw new Error(`Failed to scrape episodes: ${err.message}`)
    } finally {
      if (browser) {
        await browser.close()
      }
    }
  }

  _findInEpisodes(episodes, searchTitle) {
    // Normalize strings for comparison
    const normalize = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, '')
    const searchNorm = normalize(searchTitle)

    return episodes.find((ep) => {
      const titleNorm = normalize(ep.title)
      return titleNorm.includes(searchNorm) || searchNorm.includes(titleNorm)
    })
  }

  async _checkCache(showId) {
    const cacheFile = path.join(this.showsDir, `${showId}.json`)
    if (await fs.pathExists(cacheFile)) {
      const stats = await fs.stat(cacheFile)
      const ageHours = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60)

      // Cache valid for 24 hours
      if (ageHours < 24) {
        return fs.readJson(cacheFile)
      }
    }
    return null
  }

  async _cacheResults(showId, episodes) {
    const cacheFile = path.join(this.showsDir, `${showId}.json`)
    await fs.writeJson(cacheFile, episodes, { spaces: 2 })
  }

  _findInCache(cachedData, title) {
    if (!Array.isArray(cachedData)) {
      Logger.warn('tvdb', 'Invalid cache data format')
      return null
    }
    return this._findInEpisodes(cachedData, title)
  }
}

module.exports = TVDBScraper
