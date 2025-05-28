const path = require('path')
const fs = require('fs-extra')
const { spawn } = require('child_process')
const chalk = require('chalk')

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
    try {
      const outputPath = path.join(
        episode.show.videoSettings?.downloadPath || this.downloadDir,
        episode.toFileName()
      )

      // Ensure download directory exists
      await fs.ensureDir(path.dirname(outputPath))

      console.log(chalk.blue(`📥 Downloading: ${episode.title}`))
      console.log(chalk.gray(`   Output: ${outputPath}`))

      // Let yt-dlp handle quality selection
      const ytdlpArgs = [
        episode.url,
        '-f', 'best', // Select best quality
        '-o', outputPath,
        '--write-sub',
        '--sub-lang', 'en',
        '--embed-subs'
      ]

      const result = await new Promise((resolve, reject) => {
        const ytdlp = spawn('yt-dlp', ytdlpArgs)
        
        ytdlp.stdout.on('data', data => {
          const output = data.toString()
          // Try to extract quality from yt-dlp output
          const qualityMatch = output.match(/\[download\] \d+x(\d+)p?/)
          if (qualityMatch) {
            episode.downloadQuality = `${qualityMatch[1]}p`
          }
        })

        ytdlp.on('close', code => {
          if (code === 0) {
            resolve(outputPath)
          } else {
            reject(new Error(`yt-dlp exited with code ${code}`))
          }
        })
      })

      return result
    } catch (error) {
      throw new Error(`Download failed: ${error.message}`)
    }
  }
}

module.exports = Downloader
