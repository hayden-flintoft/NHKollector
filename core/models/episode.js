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
    this.availableQualities = data.availableQualities || []
    this.selectedQuality = null
    this.show = data.show
    this.downloadQuality = 'best' // Default to letting yt-dlp choose
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
    const sanitize = str => str.replace(/[/\\?%*:|"<>]/g, '-')
    const showName = sanitize(this.show.name)
    const epTitle = sanitize(this.title)
    // Quality will be updated after download starts
    const quality = this.downloadQuality || ''
    
    return `${showName} - ${this.seasonEpisode} - ${epTitle} - [${quality}].${this.show.videoSettings?.format || 'mp4'}`
  }
}

module.exports = Episode
