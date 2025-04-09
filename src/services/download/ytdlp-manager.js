const YTDlpWrap = require('yt-dlp-wrap').default
const path = require('path')
const fs = require('fs-extra')
const { Logger } = require('../../utils/logger')

class YTDLPManager {
  constructor() {
    this.ytdlpPath = path.join(__dirname, '../../../bin/yt-dlp')
  }

  async init() {
    const exists = await fs.pathExists(this.ytdlpPath)
    if (!exists) {
      Logger.info('ytdlp', 'Downloading yt-dlp...')
      await YTDlpWrap.downloadFromGithub(this.ytdlpPath)
      await fs.chmod(this.ytdlpPath, '755')
    }
    return new YTDlpWrap(this.ytdlpPath)
  }

  async getMetadata(url, ytdlp) {
    // ...existing metadata fetching logic...
  }
}

module.exports = YTDLPManager
