#!/usr/bin/env node
const fs = require('fs-extra')
const path = require('path')
const chalk = require('chalk')
const readline = require('readline')
const NHKScraper = require('./core/nhk-scraper')
const DownloadHistory = require('./core/download-history')
const { getEpisodeFromCache } = require('./core/get-episodes')

const SHOWS_CONFIG = path.join(__dirname, 'config', 'shows.json')

// Helper: Create a user input prompt
function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans) }))
}

// Find all files that match an episode pattern in a directory
async function findEpisodeFiles(dirPath, episodeTitle, seasonEpisode) {
  try {
    if (!await fs.pathExists(dirPath)) {
      return []
    }
    
    const files = await fs.readdir(dirPath)
    
    // Create patterns to match files
    const patterns = []
    
    // Pattern 1: Match by season/episode code (most reliable)
    if (seasonEpisode) {
      patterns.push(new RegExp(`${seasonEpisode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i'))
    }
    
    // Pattern 2: Match by episode title
    // Normalize the title for comparison
    const normalizedTitle = episodeTitle
      .toLowerCase()
      .replace(/[^a-z0-9]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    
    patterns.push(new RegExp(normalizedTitle.split(' ').filter(w => w.length > 3).join('.*'), 'i'))
    
    // Find matches
    const matches = files.filter(file => {
      // Skip directories and non-video files
      const stats = fs.statSync(path.join(dirPath, file))
      if (stats.isDirectory()) return false
      if (!['.mp4', '.mkv', '.avi', '.mov'].includes(path.extname(file).toLowerCase())) return false
      
      // Check against patterns
      return patterns.some(pattern => pattern.test(file))
    })
    
    return matches.map(file => path.join(dirPath, file))
  } catch (error) {
    console.error(chalk.red(`Error searching in ${dirPath}:`), error.message)
    return []
  }
}

// Check if episode exists in download directory
async function isEpisodeDownloaded(show, episodeTitle, seasonEpisode) {
  // Try to get download path from show settings
  const downloadPath = show.videoSettings?.downloadPath || path.join(process.cwd(), 'downloads', show.name)
  
  // Search for matching files
  const matchingFiles = await findEpisodeFiles(downloadPath, episodeTitle, seasonEpisode)
  return { found: matchingFiles.length > 0, files: matchingFiles }
}

// Get all episodes for a show with download status
async function getShowEpisodesWithStatus(show) {
  console.log(chalk.blue(`\n📺 Fetching episodes for: ${show.name}`))
  console.log(chalk.gray(`NHK URL: ${show.nhkUrl}`))
  console.log(chalk.gray(`Download Path: ${show.videoSettings?.downloadPath || 'Not set'}\n`))
  
  // Create scrapers and history
  const nhkScraper = new NHKScraper()
  const history = new DownloadHistory()
  await history.init()
  
  // Get episodes from NHK
  const nhkEpisodes = await nhkScraper.scrapeShowEpisodes(show.nhkUrl)
  console.log(chalk.green(`✅ Found ${nhkEpisodes.length} episodes on NHK\n`))
  
  // Get TVDB info for each episode
  const results = []
  
  for (const episode of nhkEpisodes) {
    // Get show slug from TVDB URL
    const showSlug = show.tvdbUrl.match(/series\/([^/#]+)/)?.[1] || ''
    
    // Get season/episode from cache
    const seasonEpisode = await getEpisodeFromCache(episode.title, showSlug)
    
    // Check download status in filesystem
    const { found, files } = await isEpisodeDownloaded(show, episode.title, seasonEpisode)
    
    // Check download history
    const isInHistory = history.isDownloaded(episode.nhkId)
    
    results.push({
      title: episode.title,
      seasonEpisode: seasonEpisode || 'Unknown',
      url: episode.url,
      nhkId: episode.nhkId,
      airDate: episode.airDate || 'Unknown',
      downloadStatus: {
        inHistory: isInHistory,
        filesFound: found,
        files: files
      }
    })
  }
  
  return results
}

// Display episodes with download status
function displayEpisodeStatus(episodes) {
  // Calculate column widths
  const idWidth = 8
  const titleWidth = Math.max(20, ...episodes.map(e => e.title.length))
  const seWidth = 10
  const airDateWidth = 12
  const statusWidth = 15
  
  // Print header
  console.log(chalk.blue('┌' + '─'.repeat(idWidth) + '┬' + '─'.repeat(titleWidth + 2) + '┬' + 
    '─'.repeat(seWidth) + '┬' + '─'.repeat(airDateWidth) + '┬' + '─'.repeat(statusWidth) + '┐'))
  
  console.log(chalk.blue('│') + chalk.yellow(' NHK ID ') + chalk.blue('│') + 
    chalk.green(' Title'.padEnd(titleWidth + 1)) + chalk.blue('│') + 
    chalk.cyan(' S/E      ') + chalk.blue('│') + 
    chalk.magenta(' Air Date   ') + chalk.blue('│') + 
    chalk.white(' Status       ') + chalk.blue('│'))
  
  console.log(chalk.blue('├' + '─'.repeat(idWidth) + '┼' + '─'.repeat(titleWidth + 2) + '┼' + 
    '─'.repeat(seWidth) + '┼' + '─'.repeat(airDateWidth) + '┼' + '─'.repeat(statusWidth) + '┤'))
  
  // Print episodes
  for (const ep of episodes) {
    const nhkId = ep.nhkId || 'N/A'
    
    // Determine status color and text
    let statusColor, statusText
    if (ep.downloadStatus.filesFound) {
      statusColor = chalk.green
      statusText = 'Downloaded'
    } else if (ep.downloadStatus.inHistory) {
      statusColor = chalk.yellow
      statusText = 'In history only'
    } else {
      statusColor = chalk.gray
      statusText = 'Not downloaded'
    }
    
    console.log(chalk.blue('│') + 
      chalk.yellow(' ' + nhkId.padEnd(idWidth - 1)) + chalk.blue('│') + 
      chalk.green(' ' + ep.title.padEnd(titleWidth + 1)) + chalk.blue('│') + 
      chalk.cyan(' ' + ep.seasonEpisode.padEnd(seWidth - 1)) + chalk.blue('│') + 
      chalk.magenta(' ' + ep.airDate.padEnd(airDateWidth - 1)) + chalk.blue('│') + 
      statusColor(' ' + statusText.padEnd(statusWidth - 1)) + chalk.blue('│'))
  }
  
  console.log(chalk.blue('└' + '─'.repeat(idWidth) + '┴' + '─'.repeat(titleWidth + 2) + '┴' + 
    '─'.repeat(seWidth) + '┴' + '─'.repeat(airDateWidth) + '┴' + '─'.repeat(statusWidth) + '┘'))
}

// Find missing episodes (in history but not on disk)
function findMissingEpisodes(episodes) {
  return episodes.filter(ep => 
    ep.downloadStatus.inHistory && !ep.downloadStatus.filesFound
  )
}

// Find orphaned files (on disk but not in history)
async function findOrphanedFiles(show) {
  const downloadPath = show.videoSettings?.downloadPath || path.join(process.cwd(), 'downloads', show.name)
  
  if (!await fs.pathExists(downloadPath)) {
    return []
  }
  
  // Get all video files in directory
  const allFiles = await fs.readdir(downloadPath)
  const videoFiles = allFiles.filter(file => {
    const stats = fs.statSync(path.join(downloadPath, file))
    if (stats.isDirectory()) return false
    return ['.mp4', '.mkv', '.avi', '.mov'].includes(path.extname(file).toLowerCase())
  }).map(file => path.join(downloadPath, file))
  
  // Get all known episode files
  const history = new DownloadHistory()
  await history.init()
  
  const nhkScraper = new NHKScraper()
  const nhkEpisodes = await nhkScraper.scrapeShowEpisodes(show.nhkUrl)
  
  // Track files that match known episodes
  const knownFiles = new Set()
  
  for (const episode of nhkEpisodes) {
    const showSlug = show.tvdbUrl.match(/series\/([^/#]+)/)?.[1] || ''
    const seasonEpisode = await getEpisodeFromCache(episode.title, showSlug)
    
    const { files } = await isEpisodeDownloaded(show, episode.title, seasonEpisode)
    files.forEach(file => knownFiles.add(file))
  }
  
  // Return files that aren't matched to any known episode
  return videoFiles.filter(file => !knownFiles.has(file))
}

async function main() {
  try {
    // Load shows
    if (!await fs.pathExists(SHOWS_CONFIG)) {
      console.log(chalk.red('No shows.json found.'))
      process.exit(1)
    }
    
    const shows = await fs.readJSON(SHOWS_CONFIG)
    if (!Array.isArray(shows) || shows.length === 0) {
      console.log(chalk.yellow('No shows found.'))
      process.exit(0)
    }
    
    // List shows
    console.log(chalk.blue('\nAvailable shows:'))
    shows.forEach((show, idx) => {
      console.log(chalk.gray(`[${idx + 1}] ${show.name}`))
    })
    
    // Prompt for show selection
    const input = await prompt('\nEnter show number to check (or "all" for all shows): ')
    
    if (input.toLowerCase() === 'all') {
      // Process all shows
      for (const show of shows) {
        const episodes = await getShowEpisodesWithStatus(show)
        displayEpisodeStatus(episodes)
        
        // Report missing episodes
        const missing = findMissingEpisodes(episodes)
        if (missing.length > 0) {
          console.log(chalk.yellow(`\n⚠️ Found ${missing.length} episodes in history but missing from disk:`))
          missing.forEach(ep => {
            console.log(chalk.gray(`  - ${ep.title} (${ep.seasonEpisode})`))
          })
        }
        
        // Report orphaned files
        const orphaned = await findOrphanedFiles(show)
        if (orphaned.length > 0) {
          console.log(chalk.yellow(`\n⚠️ Found ${orphaned.length} files on disk not matching any known episode:`))
          orphaned.forEach(file => {
            console.log(chalk.gray(`  - ${path.basename(file)}`))
          })
        }
        
        console.log('\n')
      }
    } else {
      // Process single show
      const idx = parseInt(input, 10) - 1
      if (isNaN(idx) || idx < 0 || idx >= shows.length) {
        console.log(chalk.red('Invalid show number.'))
        process.exit(1)
      }
      
      const show = shows[idx]
      const episodes = await getShowEpisodesWithStatus(show)
      displayEpisodeStatus(episodes)
      
      // Report missing episodes
      const missing = findMissingEpisodes(episodes)
      if (missing.length > 0) {
        console.log(chalk.yellow(`\n⚠️ Found ${missing.length} episodes in history but missing from disk:`))
        missing.forEach(ep => {
          console.log(chalk.gray(`  - ${ep.title} (${ep.seasonEpisode})`))
        })
      }
      
      // Report orphaned files
      const orphaned = await findOrphanedFiles(show)
      if (orphaned.length > 0) {
        console.log(chalk.yellow(`\n⚠️ Found ${orphaned.length} files on disk not matching any known episode:`))
        orphaned.forEach(file => {
          console.log(chalk.gray(`  - ${path.basename(file)}`))
        })
      }
      
      // Show episode details with file paths
      console.log(chalk.blue('\nWould you like to see detailed file paths for downloaded episodes? (y/n)'))
      const showDetails = await prompt('> ')
      
      if (showDetails.toLowerCase() === 'y') {
        console.log(chalk.blue('\nDownloaded episode details:'))
        const downloaded = episodes.filter(ep => ep.downloadStatus.filesFound)
        
        if (downloaded.length === 0) {
          console.log(chalk.yellow('No downloaded episodes found.'))
        } else {
          downloaded.forEach(ep => {
            console.log(chalk.green(`\n${ep.title} (${ep.seasonEpisode}):`))
            ep.downloadStatus.files.forEach(file => {
              console.log(chalk.gray(`  ${file}`))
            })
          })
        }
      }
    }
  } catch (error) {
    console.error(chalk.red('Error:'), error.message)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

module.exports = {
  getShowEpisodesWithStatus,
  isEpisodeDownloaded,
  findEpisodeFiles,
  findMissingEpisodes,
  findOrphanedFiles,
  displayEpisodeStatus,
  main
}