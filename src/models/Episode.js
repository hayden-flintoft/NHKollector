class Episode {
  constructor(data) {
    this.nhkId = data.nhkId
    this.title = data.title
    this.url = data.url
    this.show = data.show
    this.tvdb = data.tvdb || null
  }

  validate() {
    if (!this.nhkId) throw new Error('Episode nhkId is required')
    if (!this.title) throw new Error('Episode title is required')
    if (!this.url) throw new Error('Episode URL is required')
    if (!this.show) throw new Error('Episode show name is required')
  }

  toFileName() {
    if (!this.tvdb) {
      return `${this.show}.${this.nhkId}.mp4`
    }

    // Format: ShowName.S01E02.EpisodeTitle.mp4
    const s = this.tvdb.seasonNumber.toString().padStart(2, '0')
    const e = this.tvdb.episodeNumber.toString().padStart(2, '0')
    const safeName = this.tvdb.title
      ? this.tvdb.title.replace(/[^\w\s-]/g, '')
      : 'Unknown'

    return `${this.show}.S${s}E${e}.${safeName}.mp4`
  }
}

module.exports = Episode
