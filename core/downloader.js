const path = require('path')
const fs = require('fs-extra')
const { spawn } = require('child_process')

class Downloader {
  constructor() {
    this.downloadDir = path.join(process.cwd(), 'downloads')
  }

  async init() {
    await fs.ensureDir(this.downloadDir)
    await this._checkYtDlp()
  }

  async _checkYtDlp() {
    try {
      await new Promise((resolve, reject) => {
        const ytdlp = spawn('yt-dlp', ['--version'])
        ytdlp.on('close', code => code === 0 ? resolve() : reject())
      })
    } catch (error) {
      throw new Error('yt-dlp not found. Install with: pip install yt-dlp')
    }
  }

  async downloadEpisode(episode) {
    const outputPath = path.join(this.downloadDir, episode.toFileName())
    console.log(`📥 Downloading: ${episode.title}`)

    return new Promise((resolve, reject) => {
      const ytdlp = spawn('yt-dlp', [
        episode.url,
        '-o', outputPath,
        '--write-thumbnail',
        '--embed-subs',
        '--sub-lang', 'en'
      ])

      ytdlp.stdout.on('data', data => process.stdout.write(data))
      ytdlp.stderr.on('data', data => process.stderr.write(data))
      ytdlp.on('close', code => {
        if (code === 0) resolve(outputPath)
        else reject(new Error(`Download failed with code ${code}`))
      })
    })
  }
}

module.exports = Downloader
