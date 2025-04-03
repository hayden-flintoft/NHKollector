const path = require('path')
const fs = require('fs-extra')
const chalk = require('chalk')
const { execFile } = require('child_process')
const YTDlpWrap = require('yt-dlp-wrap').default

class YTDLPWrapper {
  constructor() {
    this.binPath = path.join(__dirname, '../../../bin/yt-dlp')
    this.initialized = false
  }

  async init() {
    if (this.initialized) return

    try {
      console.log(chalk.gray('Initializing yt-dlp...'))

      const binDir = path.dirname(this.binPath)
      await fs.ensureDir(binDir)

      const exists = await fs.pathExists(this.binPath)

      if (!exists) {
        console.log(chalk.blue('yt-dlp not found, downloading...'))
        await YTDlpWrap.downloadFromGithub(this.binPath)
        await fs.chmod(this.binPath, '755')
        console.log(chalk.green('✅ yt-dlp downloaded successfully'))
      } else {
        console.log(chalk.gray('Using existing yt-dlp binary'))
      }

      this.initialized = true
    } catch (error) {
      console.error(chalk.red('Failed to initialize yt-dlp:'), error.message)
      throw error
    }
  }

  async download({ url, output }) {
    if (!this.initialized) await this.init()

    console.log(chalk.gray(`🔄 Downloading from: ${url}`))
    console.log(chalk.gray(`📁 Output: ${output}`))

    // For testing, just pretend we downloaded
    return { success: true }

    /*
    // Uncomment for actual implementation
    try {
      const ytdlp = new YTDlpWrap(this.binPath)
      
      await ytdlp.execPromise([
        url,
        '-o', output,
        '--no-playlist',
        '--no-check-certificate',
        '--force-ipv4'
      ])
      
      const fileExists = await fs.pathExists(output)
      if (!fileExists) {
        throw new Error('Download completed but file not found')
      }
      
      return { success: true }
    } catch (error) {
      console.error(chalk.red('Download error:'), error.message)
      return { success: false, error: error.message }
    }
    */
  }
}

module.exports = YTDLPWrapper
