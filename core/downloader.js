const path = require('path')
const fs = require('fs-extra')
const { spawn } = require('child_process')
const chalk = require('chalk')

// Helper: Detect absolute Windows path (e.g. E:\ or E:/)
function isAbsoluteWinPath(p) {
  return /^[a-zA-Z]:[\\/]/.test(p)
}

// Helper: Detect UNC path (e.g. \\wsl.localhost\...)
function isUncPath(p) {
  return /^\\\\/.test(p)
}

// Helper: Sanitize a path segment for use as a directory or filename
function sanitizePathSegment(segment) {
  // Remove or replace characters not allowed in Windows or Linux filenames
  return segment.replace(/[/\\?%*:|"<>]/g, '-').replace(/\s+/g, ' ').trim()
}

// Helper: Normalize Windows-style slashes
function normalizeWinSlashes(p) {
  return p.replace(/\//g, '\\')
}

// Helper: Sanitize download path
function sanitizeDownloadPath(rawPath, showSlug) {
  // If no path is provided, return the default download directory
  if (!rawPath) {
    return path.join(process.cwd(), 'downloads', showSlug)
  }

  let sanitizedPath = rawPath

  // Sanitize each segment of the path (except for drive/UNC root)
  if (isAbsoluteWinPath(sanitizedPath) || isUncPath(sanitizedPath)) {
    // For Windows/UNC, normalize slashes and sanitize segments after root
    const parts = sanitizedPath.split(/[\\/]/)
    const root = parts[0].endsWith(':') ? parts[0] + '\\' : parts[0] // e.g. E:\
    const rest = parts.slice(1).map(sanitizePathSegment)
    sanitizedPath = [root, ...rest].join('\\')
  } else {
    // For Linux/relative, sanitize each segment
    sanitizedPath = sanitizedPath.split('/').map(sanitizePathSegment).join('/')
    if (!path.isAbsolute(sanitizedPath)) {
      sanitizedPath = path.join(process.cwd(), sanitizedPath)
    }
  }

  return sanitizedPath
}

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
      // DEBUG: Show the show object and downloadPath
      console.log(chalk.yellow('\n[DEBUG] episode.show:'), episode.show)
      console.log(chalk.yellow('[DEBUG] episode.show.videoSettings:'), episode.show?.videoSettings)
      let basePath = episode.show?.videoSettings?.downloadPath || this.downloadDir
      console.log(chalk.yellow(`[DEBUG] Initial basePath: ${basePath}`))

      // Sanitize each segment of the path (except for drive/UNC root)
      if (isAbsoluteWinPath(basePath) || isUncPath(basePath)) {
        const parts = basePath.split(/[\\/]/)
        const root = parts[0].endsWith(':') ? parts[0] + '\\' : parts[0]
        const rest = parts.slice(1).map(sanitizePathSegment)
        basePath = [root, ...rest].join('\\')
      } else {
        basePath = basePath.split('/').map(sanitizePathSegment).join('/')
        if (!path.isAbsolute(basePath)) {
          basePath = path.join(process.cwd(), basePath)
        }
      }
      console.log(chalk.yellow(`[DEBUG] Sanitized basePath: ${basePath}`))

      // Sanitize filename
      const fileName = sanitizePathSegment(episode.toFileName())
      console.log(chalk.yellow(`[DEBUG] Sanitized fileName: ${fileName}`))

      // Use correct separator for Windows/UNC
      const outputPath = (isAbsoluteWinPath(basePath) || isUncPath(basePath))
        ? path.win32.join(basePath, fileName)
        : path.join(basePath, fileName)

      console.log(chalk.yellow(`[DEBUG] Final outputPath: ${outputPath}`))

      await fs.ensureDir(path.dirname(outputPath))

      console.log(chalk.blue(`📥 Downloading: ${episode.title}`))
      console.log(chalk.gray(`   Output: ${outputPath}`))

      const ytdlpArgs = [
        episode.url,
        '-f', 'best',
        '-o', outputPath,
        '--write-sub',
        '--sub-lang', 'en',
        '--embed-subs'
      ]

      const result = await new Promise((resolve, reject) => {
        const ytdlp = spawn('yt-dlp', ytdlpArgs)
        ytdlp.stdout.on('data', data => {
          const output = data.toString()
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
