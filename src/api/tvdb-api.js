require('dotenv').config()
const axios = require('axios')
const fs = require('fs-extra')
const path = require('path')
const chalk = require('chalk')
const BaseApiClient = require('./base-api')

const debugLog = (msg) => console.log(chalk.gray(`🔍 [DEBUG] ${msg}`))

class TVDBApi extends BaseApiClient {
  constructor() {
    super({
      baseURL: 'https://api4.thetvdb.com/v4',
      dataDir: 'tvdb',
      apiKeyEnv: 'TVDB_API_KEY',
    })
    this.seriesCache = new Map()
  }

  async authenticate() {
    const response = await this.request('POST', '/login', {
      data: { apikey: this.apiKey },
    })

    if (response?.data?.token) {
      const tokenData = {
        token: response.data.token,
        expiresAt: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000
        ).toISOString(),
      }
      await fs.writeJson(this.tokenFile, tokenData)
      return tokenData.token
    }
    throw new Error('No token received from TVDB')
  }

  async getSeriesById(id) {
    try {
      // Check cache first
      if (this.seriesCache.has(id)) {
        debugLog('Using cached series info')
        return this.seriesCache.get(id)
      }

      debugLog(`Fetching series info for ID: ${id}`)

      const response = await axios.get(
        `${this.baseURL}/series/${id}/extended`,
        {
          params: {
            meta: 'episodes',
          },
          headers: await this.getHeaders(),
        }
      )

      if (!response.data?.data) {
        throw new Error('Invalid TVDB response format')
      }

      // Cache the result
      const seriesData = response.data.data
      this.seriesCache.set(id, seriesData)

      debugLog(`Found ${seriesData.episodes?.length || 0} episodes for series`)
      return seriesData
    } catch (error) {
      console.error(
        chalk.red(`Failed to fetch TVDB series ${id}:`),
        error.message
      )
      throw error
    }
  }

  async getHeaders() {
    const token = await this.getStoredToken()
    if (!token) {
      throw new Error('No valid token available')
    }
    return {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
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
      debugLog('Looking for episode match:')
      debugLog(`  Title: ${scrapedMetadata.episode}`)

      const seriesId = 254957 // Fixed ID for Journeys in Japan
      const series = await this.getSeriesById(seriesId)

      if (!series?.episodes?.length) {
        throw new Error('No episodes found in TVDB data')
      }

      // Find matching episode
      const episode = series.episodes.find((ep) =>
        ep.name?.toLowerCase().includes(scrapedMetadata.episode.toLowerCase())
      )

      if (episode) {
        return {
          episode,
          filename: this.generateFilename(series, episode),
        }
      }

      return null
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
