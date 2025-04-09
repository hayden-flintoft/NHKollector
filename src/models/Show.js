const path = require('path')
const fs = require('fs-extra')

class Show {
  constructor(data) {
    this.nhkId = data.nhkId
    this.name = data.name
    this.url = data.url
    this.tvdbId = data.tvdbId
    this.metadata = data.metadata || {}

    // Runtime state
    this.episodes = []
    this.state = {
      enabled: true,
      lastChecked: null,
      lastUpdate: null,
      episodeCount: 0,
      downloads: { total: 0, successful: 0, failed: 0 },
    }
  }

  async validate() {
    if (!this.nhkId) throw new Error('Show nhkId is required')
    if (!this.name) throw new Error('Show name is required')
    if (!this.url) throw new Error('Show URL is required')
    if (!this.tvdbId) throw new Error('Show tvdbId is required')

    // Validate URL format
    const validUrl = this.url.startsWith(
      'https://www3.nhk.or.jp/nhkworld/en/shows/'
    )
    if (!validUrl) throw new Error('Invalid NHK show URL format')
  }

  async loadState() {
    const stateFile = path.join(
      __dirname,
      '../../data/shows',
      this.name.toLowerCase(),
      'state.json'
    )
    if (await fs.pathExists(stateFile)) {
      this.state = await fs.readJson(stateFile)
    }
  }

  async saveState() {
    const stateDir = path.join(
      __dirname,
      '../../data/shows',
      this.name.toLowerCase()
    )
    await fs.ensureDir(stateDir)
    await fs.writeJson(path.join(stateDir, 'state.json'), this.state, {
      spaces: 2,
    })
  }
}

module.exports = Show
