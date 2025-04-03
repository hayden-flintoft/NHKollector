const path = require('path')
const fs = require('fs-extra')
const chalk = require('chalk')
const YTDLPWrapper = require('./ytdlp-wrapper')
const Queue = require('better-queue')

class Downloader {
  constructor(config = {}) {
    this.downloadDir =
      config.downloadDir || path.join(__dirname, '../../../downloads')
    this.ytdlp = new YTDLPWrapper()
    this.downloadQueue = new Queue(this.processDownload.bind(this), {
      concurrent: config.concurrent || 1,
      maxRetries: config.maxRetries || 3,
      retryDelay: 5000,
    })
  }

  async init() {
    await fs.ensureDir(this.downloadDir)
    await this.ytdlp.init()
  }

  async downloadEpisode(episode) {
    try {
      console.log(chalk.blue(`\n📥 Downloading episode: ${episode.title}`))

      // Skip if episode doesn't have URL
      if (!episode.url) {
        console.log(chalk.yellow('⚠️ Episode has no URL, skipping'))
        return { success: false, error: 'No URL provided' }
      }

      // Generate filename
      const fileName = episode.toFileName
        ? episode.toFileName()
        : `${episode.show}.${episode.nhkId}.mp4`

      const outputPath = path.join(this.downloadDir, fileName)
      console.log(chalk.gray(`Output file: ${fileName}`))

      // Check if file already exists
      if (await fs.pathExists(outputPath)) {
        console.log(chalk.yellow('⚠️ File already exists, skipping download'))
        return { success: true, path: outputPath, skipped: true }
      }

      // For testing, create a dummy file instead of actual download
      console.log(
        chalk.yellow(
          '⚠️ TESTING MODE: Creating dummy file instead of downloading'
        )
      )
      await fs.writeFile(outputPath, 'Test file content')

      // In production, uncomment this to use actual downloader
      /*
      const fullUrl = `https://www3.nhk.or.jp${episode.url}`
      console.log(chalk.gray(`URL: ${fullUrl}`))
      
      const result = await this.ytdlp.download({
        url: fullUrl,
        output: outputPath
      })
      
      if (!result.success) {
        throw new Error(result.error || 'Download failed')
      }
      */

      console.log(chalk.green(`✅ Download complete: ${fileName}`))
      return { success: true, path: outputPath }
    } catch (error) {
      console.error(chalk.red(`❌ Download failed: ${error.message}`))
      return { success: false, error: error.message }
    }
  }

  async queueDownload(episode) {
    return new Promise((resolve, reject) => {
      this.downloadQueue.push(episode, (err, result) => {
        if (err) reject(err)
        else resolve(result)
      })
    })
  }

  async processDownload(episode, cb) {
    try {
      const result = await this.downloadEpisode(episode)
      cb(null, result)
    } catch (error) {
      cb(error)
    }
  }
}

module.exports = Downloader
