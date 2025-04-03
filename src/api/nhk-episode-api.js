const axios = require('axios')
const { Logger } = require('../utils/logger')

class NHKEpisodeAPI {
  async getAvailableEpisodes(showUrl) {
    try {
      const showSlug = showUrl.split('/').filter(Boolean).pop()
      const apiUrl = `https://www3.nhk.or.jp/nhkworld/data/en/shows/${showSlug}/episodes.json`

      const response = await axios.get(apiUrl, {
        headers: this._getHeaders(showUrl),
      })

      return this._parseEpisodeResponse(response.data)
    } catch (error) {
      Logger.error('api', 'Failed to get episodes', error)
      throw error
    }
  }

  _getHeaders(referer) {
    return {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      Accept: 'application/json',
      Referer: referer,
    }
  }

  _parseEpisodeResponse(data) {
    // ...existing episode parsing logic...
  }
}

module.exports = NHKEpisodeAPI
