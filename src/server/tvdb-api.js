require('dotenv').config()
const axios = require('axios')
const fs = require('fs-extra')
const path = require('path')
const chalk = require('chalk')

class TVDBApi {
  constructor() {
    this.apiKey = process.env.TVDB_API_KEY
    this.pin = process.env.TVDB_PIN
    this.baseURL = 'https://api4.thetvdb.com/v4'
    this.dataDir = path.join(__dirname, '../../downloads/data')
    this.tokenFile = path.join(this.dataDir, 'tvdb-token.json')
    this.showDataFile = path.join(this.dataDir, 'show-data.json')
  }

  async init() {
    try {
      await fs.ensureDir(this.dataDir)

      // Check if we have a valid token
      const token = await this.getStoredToken()
      if (!token) {
        await this.login()
      }
    } catch (error) {
      console.error(chalk.red('Failed to initialize TVDB API:', error.message))
      throw error
    }
  }

  async getStoredToken() {
    try {
      if (await fs.pathExists(this.tokenFile)) {
        const tokenData = await fs.readJson(this.tokenFile)
        // Check if token is still valid (less than 1 month old)
        if (new Date(tokenData.expiresAt) > new Date()) {
          return tokenData.token
        }
      }
      return null
    } catch (error) {
      console.error(chalk.yellow('Error reading stored token:', error.message))
      return null
    }
  }

  async login() {
    try {
      console.log(chalk.blue('🔑 Logging in to TVDB API...'))

      const response = await axios.post(`${this.baseURL}/login`, {
        apikey: this.apiKey,
        pin: this.pin,
      })

      if (response.data?.data?.token) {
        // Store token with expiration date (1 month from now)
        const tokenData = {
          token: response.data.data.token,
          expiresAt: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000
          ).toISOString(),
        }

        await fs.writeJson(this.tokenFile, tokenData)
        console.log(chalk.green('✅ Successfully logged in to TVDB'))
        return tokenData.token
      } else {
        throw new Error('No token received from TVDB')
      }
    } catch (error) {
      console.error(chalk.red('Failed to login to TVDB:'), error.message)
      if (error.response) {
        console.error(
          chalk.gray('Response:', JSON.stringify(error.response.data, null, 2))
        )
      }
      throw error
    }
  }

  async getSeriesById(id) {
    try {
      const token = await this.getStoredToken()
      if (!token) {
        throw new Error('No valid token available')
      }

      console.log(chalk.blue(`🔍 Fetching series info for ID: ${id}`))

      const response = await axios.get(
        `${this.baseURL}/series/${id}/extended`,
        {
          params: {
            meta: 'episodes', // Include episodes in response
          },
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (response.data?.data) {
        // Save to show data file
        const showData = await this.loadShowData()
        showData[id] = {
          ...response.data.data,
          lastFetched: new Date().toISOString(),
        }
        await this.saveShowData(showData)

        console.log(
          chalk.green('✅ Successfully fetched and saved series info')
        )
        return response.data.data
      } else {
        throw new Error('Invalid response format from TVDB')
      }
    } catch (error) {
      console.error(chalk.red('Failed to fetch series:'), error.message)
      if (error.response?.status === 404) {
        console.error(chalk.yellow('Series not found'))
      }
      throw error
    }
  }

  async loadShowData() {
    try {
      if (await fs.pathExists(this.showDataFile)) {
        return await fs.readJson(this.showDataFile)
      }
      return {}
    } catch (error) {
      console.error(chalk.yellow('Error reading show data:', error.message))
      return {}
    }
  }

  async saveShowData(data) {
    await fs.writeJson(this.showDataFile, data, { spaces: 2 })
  }

  async findEpisodeFromScrapedData(scrapedMetadata) {
    try {
      console.log(chalk.blue('🔍 Looking up episode information...'))

      // First try to find show in local data
      const showData = await this.loadShowData()
      const showId = this.findShowByName(showData, scrapedMetadata.show)

      if (!showId) {
        // Search TVDB API for show
        const searchResults = await this.searchSeries(scrapedMetadata.show)
        if (searchResults.length === 0) {
          throw new Error('Show not found on TVDB')
        }
        // Get full series data including episodes
        await this.getSeriesById(searchResults[0].id)
        return this.findEpisodeFromScrapedData(scrapedMetadata) // Retry with updated data
      }

      // Find matching episode in show data
      const show = showData[showId]
      const episode = this.findMatchingEpisode(show.episodes, scrapedMetadata)

      if (!episode) {
        // Episode not found - may need to update series data
        await this.getSeriesById(showId)
        return this.findEpisodeFromScrapedData(scrapedMetadata) // Retry with updated data
      }

      return {
        show: show,
        episode: episode,
        filename: this.generateFilename(show, episode),
      }
    } catch (error) {
      console.error(chalk.red('Failed to find episode:'), error.message)
      throw error
    }
  }

  findShowByName(showData, name) {
    const normalizedName = name.toLowerCase()

    for (const [id, show] of Object.entries(showData)) {
      if (show.name.toLowerCase() === normalizedName) {
        return id
      }
      // Check aliases
      if (
        show.aliases?.some(
          (alias) => alias.name?.toLowerCase() === normalizedName
        )
      ) {
        return id
      }
    }
    return null
  }

  findMatchingEpisode(episodes, metadata) {
    if (!episodes) return null

    // Try to match by air date first
    if (metadata.airDate) {
      const match = episodes.find((ep) => ep.aired === metadata.airDate)
      if (match) return match
    }

    // Try to match by episode title
    if (metadata.episode) {
      const match = episodes.find(
        (ep) => ep.name?.toLowerCase() === metadata.episode.toLowerCase()
      )
      if (match) return match
    }

    return null
  }

  async searchSeries(query, type = 'series') {
    const token = await this.getStoredToken()
    if (!token) {
      throw new Error('No valid token available')
    }

    const response = await axios.get(`${this.baseURL}/search`, {
      params: {
        query,
        type,
        limit: 5,
      },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    return response.data?.data || []
  }

  generateFilename(show, episode) {
    const cleanText = (text = '') => text.replace(/[/\\?%*:|"<>]/g, '-')
    const padNumber = (num) => String(num || '0').padStart(2, '0')

    return `${cleanText(show.name)}.s${padNumber(
      episode.seasonNumber
    )}e${padNumber(episode.number)}.${cleanText(episode.name)}.${
      episode.aired
    }.mp4`
  }
}

module.exports = TVDBApi
