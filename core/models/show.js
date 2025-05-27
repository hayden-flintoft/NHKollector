const path = require('path')

class Show {
  constructor(data) {
    this.name = data.name
    this.nhkId = data.nhkId
    this.nhkUrl = data.nhkurl
    this.tvdbUrl = data.tvdburl
    this.metadata = data.metadata || {}
  }

  validate() {
    if (!this.name) throw new Error('Show requires name')
    if (!this.nhkUrl) throw new Error('Show requires nhkurl')
    if (!this.tvdbUrl) throw new Error('Show requires tvdburl')
  }

  getTvdbSlug() {
    const match = this.tvdbUrl.match(/series\/([^/#]+)/)
    return match ? match[1] : null
  }

  toJSON() {
    return {
      nhkId: this.nhkId,
      name: this.name,
      nhkurl: this.nhkUrl,
      tvdburl: this.tvdbUrl,
      metadata: this.metadata
    }
  }
}

module.exports = Show