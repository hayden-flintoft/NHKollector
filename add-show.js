#!/usr/bin/env node
const readline = require('readline')
const fs = require('fs-extra')
const path = require('path')
const chalk = require('chalk')
const puppeteer = require('puppeteer')

const SHOWS_CONFIG = path.join(__dirname, 'config', 'shows.json')

function sanitizeUrl(url, base, slugPattern) {
  url = url.trim()
  if (!url.startsWith(base)) throw new Error(`URL must start with ${base}`)
  const slug = url.replace(base, '').replace(/\/+$/, '').split('/')[0]
  if (!slug.match(slugPattern)) throw new Error('Invalid slug in URL')
  return `${base}${slug}/`
}

function sanitizeDownloadPath(input, showSlug) {
  let p = input.trim()
  if (!p) return `downloads/${showSlug}`
  // Remove dangerous chars, normalize slashes
  p = p.replace(/["'<>|?*]/g, '').replace(/\\/g, '/')
  return p
}

async function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans) }))
}

async function fetchShowName(nhkUrl) {
  let browser
  try {
    browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] })
    const page = await browser.newPage()
    await page.goto(nhkUrl, { waitUntil: 'domcontentloaded', timeout: 20000 })
    const title = await page.title()
    if (!title) throw new Error('Could not get page title')
    return title.replace(/\s*\|\s*NHK WORLD-JAPAN\s*$/, '').trim()
  } finally {
    if (browser) await browser.close()
  }
}

async function urlExists(url) {
  try {
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] })
    const page = await browser.newPage()
    const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 })
    await browser.close()
    return resp && resp.status() === 200
  } catch {
    return false
  }
}

async function main() {
  try {
    console.log(chalk.blue('Add a new show to NHKollector\n'))

    // 1. NHK URL
    let nhkUrl
    while (true) {
      nhkUrl = await prompt('Enter NHK show URL (e.g. https://www3.nhk.or.jp/nhkworld/en/shows/journeys/): ')
      try {
        nhkUrl = sanitizeUrl(nhkUrl, 'https://www3.nhk.or.jp/nhkworld/en/shows/', /^[a-z0-9\-]+$/i)
        if (!(await urlExists(nhkUrl))) throw new Error('NHK page not found')
        break
      } catch (e) {
        console.log(chalk.red(`  ✗ ${e.message}`))
      }
    }
    const showSlug = nhkUrl.split('/').filter(Boolean).pop()

    // 2. TVDB URL
    let tvdbUrl
    while (true) {
      tvdbUrl = await prompt('Enter TVDB show URL (e.g. https://thetvdb.com/series/journeys-in-japan/): ')
      try {
        tvdbUrl = sanitizeUrl(tvdbUrl, 'https://thetvdb.com/series/', /^[a-z0-9\-]+$/i)
        // Check /allseasons/official exists
        const testUrl = tvdbUrl + 'allseasons/official'
        if (!(await urlExists(testUrl))) throw new Error('TVDB page not found')
        tvdbUrl = testUrl
        break
      } catch (e) {
        console.log(chalk.red(`  ✗ ${e.message}`))
      }
    }

    // 3. Download path
    let downloadPath = await prompt(`Enter download path [default: downloads/${showSlug}]: `)
    downloadPath = sanitizeDownloadPath(downloadPath, showSlug)

    // 4. Get show name from NHK page
    process.stdout.write(chalk.gray('Fetching show name from NHK... '))
    const showName = await fetchShowName(nhkUrl)
    console.log(chalk.green(showName))

    // 5. Add to config
    const showObj = {
      name: showName,
      nhkUrl,
      tvdbUrl,
      videoSettings: {
        format: 'mp4',
        downloadPath
      }
    }

    let shows = []
    if (await fs.pathExists(SHOWS_CONFIG)) {
      shows = await fs.readJSON(SHOWS_CONFIG)
    }
    shows.push(showObj)
    await fs.writeJSON(SHOWS_CONFIG, shows, { spaces: 2 })

    console.log(chalk.green('\n✅ Show added successfully!'))
    console.log(chalk.gray(JSON.stringify(showObj, null, 2)))
  } catch (err) {
    console.error(chalk.red('Error:'), err.message)
    process.exit(1)
  }
}

if (require.main === module) main()
    module.exports = main