const express = require('express')
const IndexerConfig = require('../config/indexer-config')
const FeedGenerator = require('../utils/feed-generator')
const { scrapeEpisodes } = require('../services/scraper/nhk-episode-scraper')

class IndexerServer {
  constructor(config = {}) {
    this.port = config.port || 9117
    this.apiKey = config.apiKey
    this.baseUrl = `http://localhost:${this.port}`
    this.config = new IndexerConfig()
    this.feedGenerator = new FeedGenerator()
    this.app = express()
  }

  async start() {
    // API Key middleware
    this.app.use((req, res, next) => {
      const apiKey = req.query.apikey
      if (!apiKey || apiKey !== this.apiKey) {
        return res.status(401).send('Unauthorized')
      }
      next()
    })

    // Capabilities endpoint
    this.app.get('/api', async (req, res) => {
      this.config.baseUrl = this.baseUrl
      const xml = this.feedGenerator.generateCapsXml(this.config)
      res.set('Content-Type', 'application/xml')
      res.send(xml)
    })

    // Search endpoint
    this.app.get('/api/v3/indexer', async (req, res) => {
      try {
        const q = req.query.q
        const show = this.config.getShowByQuery(q)

        if (!show) {
          return res.status(404).send('Show not found')
        }

        const episodes = await scrapeEpisodes(show.url)
        this.config.baseUrl = this.baseUrl

        const xml = this.feedGenerator.generateSearchXml(episodes, this.config)
        res.set('Content-Type', 'application/xml')
        res.send(xml)
      } catch (error) {
        console.error('Search error:', error)
        res.status(500).send(error.message)
      }
    })

    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.send('OK')
    })

    return new Promise((resolve, reject) => {
      this.server = this.app
        .listen(this.port, () => {
          console.log(`Indexer server running on port ${this.port}`)
          resolve()
        })
        .on('error', reject)
    })
  }

  async stop() {
    if (this.server) {
      return new Promise((resolve) => {
        this.server.close(resolve)
      })
    }
  }
}

module.exports = IndexerServer
