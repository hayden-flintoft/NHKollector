const { ShowManager } = require('../services/show/show-manager')
const YTDLPWrapper = require('../services/download/ytdlp-wrapper')
const scrapeEpisodes = require('../services/scraper/nhk-episode-scraper')

class IndexerConfig {
  constructor() {
    this.showManager = new ShowManager()
    this.downloader = new YTDLPWrapper()
    this.baseUrl = 'https://www3.nhk.or.jp/nhkworld/en/'
    this.categories = {
      TV: 5000,
      TV_DOCUMENTARY: 5020,
    }
  }

  async init() {
    await this.showManager.init()
    await this.downloader.init()
  }

  getCategories() {
    return this.categories
  }

  // Let Sonarr handle categories
  getShowCategories(nhkId) {
    return [this.categories.TV, this.categories.TV_DOCUMENTARY]
  }

  // Look for shows tagged with "NHK" in Sonarr
  async getShowsToProcess(sonarrApi) {
    const shows = await sonarrApi.getSeries()
    return shows.filter(
      (show) =>
        show.tags && show.tags.some((tag) => tag.label.toLowerCase() === 'nhk')
    )
  }

  // Get available episodes for a show from NHK website
  async getAvailableEpisodes(showUrl) {
    try {
      return await scrapeEpisodes(showUrl)
    } catch (error) {
      console.error(`Failed to get episodes: ${error.message}`)
      return []
    }
  }

  // Download an episode using yt-dlp
  async downloadEpisode(episode, outputPath) {
    return await this.downloader.download({
      url: `${this.baseUrl}${episode.url}`,
      output: outputPath,
    })
  }

  getShowByQuery(query) {
    // Default to Journeys in Japan if no query
    if (!query) {
      return {
        nhkId: '2007550',
        name: 'Journeys in Japan',
        url: 'https://www3.nhk.or.jp/nhkworld/en/shows/journeys/',
        tvdbId: 254957,
      }
    }

    // TODO: Implement show searching when we add more shows
    return null
  }

  // Search endpoint called by Sonarr via Prowlarr
  async search({ query, season, episode }) {
    try {
      // 1. Search all NHK shows by title
      const shows = await this.searchNHKShows(query)
      const results = []

      for (const show of shows) {
        // 2. Get available episodes
        const episodes = await this.getAvailableEpisodes(show.url)

        // 3. Match using absolute numbering
        // NHK IDs are sequential, so we can use them as absolute numbers
        // Example: 2007550, 2007551, 2007552...
        const matches = episodes.filter((ep) => {
          const absoluteNumber = parseInt(ep.nhkId.slice(-3))
          return absoluteNumber === episode
        })

        results.push(...matches)
      }

      return this.formatResults(results)
    } catch (error) {
      console.error('Search failed:', error)
      return []
    }
  }

  // Format results for Prowlarr/Sonarr
  formatResults(episodes) {
    return episodes.map((ep) => ({
      guid: ep.nhkId,
      title: ep.title,
      absoluteNumber: parseInt(ep.nhkId.slice(-3)),
      downloadUrl: `${this.baseUrl}${ep.url}`,
      size: 500000000, // Estimate 500MB
      publishDate: ep.onair,
    }))
  }
}

module.exports = IndexerConfig
