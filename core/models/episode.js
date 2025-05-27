const path = require('path')

class Episode {
  constructor(data) {
    // Map incoming data to consistent property names
    this.show = data.showTitle || data.show
    this.title = data.episodeTitle || data.title
    this.url = data.videoUrl || data.url
    this.description = data.description || ''
    this.thumbnailUrl = data.thumbnailUrl || ''
    this.nhkId = this._extractNhkId(data.url)
    this.seasonEpisode = data.seasonEpisode || ''
  }

  _extractNhkId(url) {
    return url.match(/\/(\d+)\/?$/)?.[1] || null
  }

  validate() {
    if (!this.show) throw new Error('Episode requires show/showTitle')
    if (!this.title) throw new Error('Episode requires title/episodeTitle')
    if (!this.url) throw new Error('Episode requires url/videoUrl')
  }

  toFileName() {
    const titleCase = (str) => {
      return str.split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ')
    }

    const safeShow = titleCase(this.show).replace(/[/\\?%*:|"<>]/g, '-')
    const safeTitle = titleCase(this.title).replace(/[/\\?%*:|"<>]/g, '-')
    
    // Include season/episode if available
    const episodeInfo = this.seasonEpisode ? `${this.seasonEpisode} ` : ''
    return `${safeShow} - ${episodeInfo}${safeTitle} [720p][200MB].mp4`
  }
}

module.exports = Episode
