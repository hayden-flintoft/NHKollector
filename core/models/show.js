const path = require('path')

class Show {
  constructor(data) {
    this.name = data.name
    this.nhkUrl = data.nhkUrl || data.nhkurl  // Handle both cases
    this.tvdbUrl = data.tvdbUrl || data.tvdburl  // Handle both cases
    this.metadata = data.metadata || {}
    this.videoSettings = {
      format: "mp4",
      downloadPath: `downloads/${this.name.toLowerCase().replace(/\s+/g, '-')}`
    }
  }

  validate() {
    if (!this.name) throw new Error('Show requires name')
    if (!this.nhkUrl) throw new Error('Show requires nhkUrl')
    if (!this.tvdbUrl) throw new Error('Show requires tvdbUrl')
  }

  getTvdbSlug() {
    const match = this.tvdbUrl.match(/series\/([^/#]+)/)
    return match ? match[1] : null
  }

  toJSON() {
    return {
      name: this.name,
      nhkUrl: this.nhkUrl,
      tvdbUrl: this.tvdbUrl,
      metadata: this.metadata,
      videoSettings: this.videoSettings
    }
  }
}

module.exports = Show