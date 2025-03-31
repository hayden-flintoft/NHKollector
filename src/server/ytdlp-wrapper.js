require('dotenv').config()
const YTDlpWrap = require('yt-dlp-wrap').default
const path = require('path')
const fs = require('fs-extra')
const chalk = require('chalk')
const axios = require('axios')
const cheerio = require('cheerio')

// Add this near the top, after the requires
const debugLog = (msg) => console.log(chalk.gray(`🔍 [DEBUG] ${msg}`))

class VideoDownloader {
  constructor() {
    this.initialized = false
    this.downloadDir = path.join(__dirname, '../../downloads')
    this.tvdbApiKey = process.env.TVDB_API_KEY
    this.tvdbPin = process.env.TVDB_PIN
    this.tvdbUserKey = process.env.TVDB_USERKEY
  }

  async init() {
    try {
      const ytdlpPath = path.join(__dirname, '../../bin/yt-dlp')

      // Check if yt-dlp exists
      const exists = await fs.pathExists(ytdlpPath)
      if (!exists) {
        console.log(chalk.blue('📥 Downloading yt-dlp...'))
        await YTDlpWrap.downloadFromGithub(ytdlpPath)
        await fs.chmod(ytdlpPath, '755')
      }

      this.ytdlp = new YTDlpWrap(ytdlpPath)
      this.initialized = true
    } catch (error) {
      console.error(chalk.red('Failed to initialize:', error))
      throw error
    }
  }

  async _getVideoMetadata(url) {
    if (!this.initialized) {
      await this.init()
    }

    return new Promise((resolve, reject) => {
      let outputData = ''
      let errorData = ''

      console.log(chalk.blue('🔍 Fetching video metadata...'))

      const process = this.ytdlp.exec([
        url,
        '--dump-single-json',
        '--no-download',
        '--no-warnings',
        '--no-progress',
        '--format',
        'best', // Add format to ensure we get video info
        '--write-info-json',
        '--quiet', // Reduce noise in output
      ])

      process
        .on('stdout', (output) => {
          outputData += output
          debugLog(`Received metadata chunk: ${output.length} bytes`)
        })
        .on('stderr', (error) => {
          errorData += error
          if (error.trim()) {
            debugLog(`stderr: ${error}`)
          }
        })
        .on('error', (error) => {
          console.error(chalk.red('Error:', error))
          if (errorData) {
            console.error(chalk.red('Error output:', errorData))
          }
          reject(error)
        })
        .on('close', (code) => {
          if (code !== 0) {
            reject(
              new Error(
                `yt-dlp exited with code ${code}\nError output: ${errorData}`
              )
            )
            return
          }

          // Check if we got any output
          if (!outputData.trim()) {
            // Try to get info directly using --get-title and --get-id
            this._getFallbackMetadata(url).then(resolve).catch(reject)
            return
          }

          try {
            const metadata = JSON.parse(outputData)
            console.log(chalk.green('✅ Metadata retrieved successfully'))
            resolve(metadata)
          } catch (err) {
            console.error(chalk.red('Failed to parse metadata:'))
            console.error(chalk.gray('Raw output:'))
            console.error(chalk.gray(outputData))
            reject(new Error(`Parse error: ${err.message}`))
          }
        })
    })
  }

  // Add a fallback method for basic metadata
  async _getFallbackMetadata(url) {
    const getInfo = async (args) => {
      return new Promise((resolve) => {
        let output = ''
        this.ytdlp
          .exec([url, ...args])
          .on('stdout', (data) => {
            output += data
          })
          .on('close', () => resolve(output.trim()))
      })
    }

    const title = await getInfo(['--get-title', '--no-warnings'])
    const id = await getInfo(['--get-id', '--no-warnings'])
    const format = await getInfo(['--get-format', '--no-warnings'])

    return {
      title,
      id,
      format,
      _fallback: true,
    }
  }

  async downloadEpisode(url) {
    if (!this.initialized) {
      await this.init()
    }

    // First get metadata from scraping
    console.log(chalk.blue('📥 Getting show information...'))
    const pageMetadata = await this.scrapeShowMetadata(url)

    await fs.ensureDir(this.downloadDir)

    // Generate filename using scraped metadata
    const cleanText = (text = '') => text.replace(/[/\\?%*:|"<>]/g, '-')
    const padNumber = (num) => String(num || '0').padStart(2, '0')

    const filename = `${cleanText(pageMetadata.show)}.S${pageMetadata.season}E${
      pageMetadata.episodeNumber
    }.${cleanText(pageMetadata.episode)}.${pageMetadata.airDate}.%(ext)s`

    // Download options
    const options = [
      url,
      '--format',
      'bestvideo[height>=1080][ext=mp4]+bestaudio[language=en]/best[height>=1080][ext=mp4]/best',
      '--output',
      path.join(this.downloadDir, filename),
      '--merge-output-format',
      'mp4',
      '--write-thumbnail',
      '--embed-subs',
      '--sub-lang',
      'en',
    ]

    return new Promise((resolve, reject) => {
      console.log(chalk.blue('⏬ Starting download...'))
      console.log(chalk.gray(`📁 Filename: ${filename}`))

      this.ytdlp
        .exec(options)
        .on('progress', (progress) => {
          const percent =
            typeof progress === 'object'
              ? progress.percent
              : parseFloat(progress)
          const formattedProgress = percent ? percent.toFixed(2) : '0.00'
          process.stdout.write(`\r💾 Downloading: ${formattedProgress}%`)
        })
        .on('error', (error) => {
          console.error(chalk.red('\n❌ Download failed:', error))
          reject(error)
        })
        .on('close', () => {
          console.log(chalk.green('\n✅ Download complete!'))
          resolve({
            dir: this.downloadDir,
            filename,
            metadata: pageMetadata,
          })
        })
    })
  }

  async scrapeShowMetadata(url) {
    try {
      console.log(chalk.blue('🔍 Scraping show metadata from:', url))
      const response = await axios.get(url)
      const $ = cheerio.load(response.data)

      // Get and parse JSON-LD data
      const jsonLD = $('script[type="application/ld+json"]').html()
      let metadata = {
        show: 'Unknown Show',
        episode: '',
        season: '2025',
        episodeNumber: '00',
        airDate: new Date().toISOString().split('T')[0],
        url: url,
        scrapedAt: new Date().toISOString(),
      }

      if (jsonLD) {
        try {
          const jsonData = JSON.parse(jsonLD)
          debugLog('Found JSON-LD data')

          // Find VideoObject and BreadcrumbList
          const videoData = jsonData.find(
            (item) => item['@type'] === 'VideoObject'
          )
          const breadcrumbs = jsonData.find(
            (item) => item['@type'] === 'BreadcrumbList'
          )

          if (videoData) {
            debugLog('Found VideoObject data')
            // Get episode title and date from VideoObject
            metadata.episode = videoData.name?.split(' - ')[0]?.trim() || ''
            metadata.description = videoData.description
            metadata.uploadDate = videoData.uploadDate
            if (videoData.uploadDate) {
              metadata.airDate = new Date(videoData.uploadDate)
                .toISOString()
                .split('T')[0]
            }
          }

          if (breadcrumbs) {
            debugLog('Found BreadcrumbList data')
            // Get show name from breadcrumbs
            metadata.show =
              breadcrumbs.itemListElement[2]?.name || metadata.show
          }
        } catch (e) {
          debugLog('Failed to parse JSON-LD:', e.message)
        }
      }

      // Fallback to HTML scraping if needed
      if (metadata.show === 'Unknown Show' || !metadata.episode) {
        debugLog('Using HTML fallbacks')
        if (!metadata.show) {
          const ogTitle = $('meta[property="og:title"]').attr('content')
          if (ogTitle) {
            metadata.show =
              ogTitle.split(' - ')[1]?.replace(' | NHK WORLD-JAPAN', '') ||
              metadata.show
          }
        }
        if (!metadata.episode) {
          metadata.episode = $('.tVideoEpisodeHero__title').text().trim()
        }
        if (!metadata.airDate) {
          const dateText = $('.tVideoEpisodeHero__date').text().trim()
          const match = dateText.match(/Broadcast on ([A-Za-z]+ \d+, \d{4})/)
          if (match) {
            metadata.airDate = new Date(match[1]).toISOString().split('T')[0]
          }
        }
      }

      // Save metadata
      const metadataDir = path.join(__dirname, '../../metadata')
      await fs.ensureDir(metadataDir)

      const safeShowName = metadata.show.replace(/[/\\?%*:|"<>]/g, '-')
      const filename = `${safeShowName}_S${metadata.season}E${metadata.episodeNumber}_${metadata.airDate}.json`
      const filePath = path.join(metadataDir, filename)

      await fs.writeJson(filePath, metadata, { spaces: 2 })
      console.log(chalk.green('✅ Metadata saved to:', filename))

      return metadata
    } catch (error) {
      console.error(chalk.red('Failed to scrape metadata:'), error.message)
      throw error
    }
  }
}

module.exports = VideoDownloader
