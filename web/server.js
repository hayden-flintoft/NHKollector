const express = require('express')
const cors = require('cors')
const path = require('path')
const chalk = require('chalk')

class WebServer {
  constructor(nhkService) {
    this.app = express()
    this.nhkService = nhkService
    this.setupMiddleware()
    this.setupRoutes()
  }

  setupMiddleware() {
    this.app.use(cors())
    this.app.use(express.json())
    this.app.use(express.static(path.join(__dirname, 'public')))
  }

  setupRoutes() {
    // API Routes
    this.app.get('/api/shows', this.getShows.bind(this))
    this.app.post('/api/shows', this.addShow.bind(this))
    this.app.put('/api/shows/:id', this.updateShow.bind(this))
    this.app.delete('/api/shows/:id', this.deleteShow.bind(this))
    
    this.app.get('/api/episodes/:showId', this.getEpisodes.bind(this))
    this.app.post('/api/episodes/:episodeId/download', this.downloadEpisode.bind(this))
    
    this.app.get('/api/downloads', this.getDownloads.bind(this))
    this.app.get('/api/status', this.getStatus.bind(this))
    this.app.get('/api/logs', this.getLogs.bind(this))
    
    // Serve React app for all other routes
    this.app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'index.html'))
    })
  }

  async getShows(req, res) {
    try {
      const shows = await fs.readJSON(path.join(process.cwd(), 'config', 'shows.json'))
      res.json(shows)
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  }

  // Additional API methods...
}

module.exports = WebServer