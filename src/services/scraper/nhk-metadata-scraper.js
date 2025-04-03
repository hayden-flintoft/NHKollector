const axios = require('axios')
const cheerio = require('cheerio')
const path = require('path')
const fs = require('fs-extra')
const { Logger } = require('../../utils/logger')

class NHKMetadataScraper {
  async scrapeShowMetadata(url) {
    try {
      Logger.debug('scraper', `Scraping metadata from: ${url}`)
      const response = await axios.get(url)
      const $ = cheerio.load(response.data)

      const metadata = await this._parseMetadata($, url)
      await this._saveMetadata(metadata)

      return metadata
    } catch (error) {
      Logger.error('scraper', 'Failed to scrape metadata', error)
      throw error
    }
  }

  async _parseMetadata($, url) {
    // ...existing metadata parsing logic...
  }

  async _saveMetadata(metadata) {
    // ...existing metadata saving logic...
  }
}

module.exports = NHKMetadataScraper
