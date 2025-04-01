require('dotenv').config()
const puppeteer = require('puppeteer')
const fs = require('fs-extra')
const path = require('path')
const chalk = require('chalk')

const debugLog = (msg) => console.log(chalk.gray(`🔍 [DEBUG] ${msg}`))

async function scrapeEpisodes(url) {
  let browser
  try {
    console.log(chalk.blue('🔍 Getting episodes from:', url))
    debugLog('Launching browser...')

    // Launch browser with specific configuration for Linux
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
      executablePath: process.env.CHROME_BIN || null,
    })

    debugLog('Browser launched successfully')

    // Go to URL and wait for content to load
    const page = await browser.newPage()

    // Go to URL and wait for content to load
    await page.goto(url, { waitUntil: 'networkidle0' })

    // Wait for episode list to appear
    await page.waitForSelector('.tItemListEpisode__list', { timeout: 10000 })

    // Click "See More" until no more button
    let hasMoreEpisodes = true
    while (hasMoreEpisodes) {
      try {
        debugLog('Looking for "See More" button...')
        const moreButton = await page.$('.pBtnMore.tItemListEpisode__more')

        if (moreButton) {
          debugLog('Clicking "See More" button...')
          await moreButton.click()
          // Wait for new episodes to load
          await page.waitForTimeout(1000)
          await page.waitForNetworkIdle({ timeout: 5000 })
        } else {
          debugLog('No more "See More" button found')
          hasMoreEpisodes = false
        }
      } catch (error) {
        debugLog('No more episodes to load')
        hasMoreEpisodes = false
      }
    }

    // Get all episodes after loading everything
    const episodes = await page.evaluate(() => {
      const items = []
      document
        .querySelectorAll('.pItemEpisode.tItemListEpisode__item')
        .forEach((article, index) => {
          const link = article.querySelector('a')
          if (link) {
            const href = link.getAttribute('href')
            const nhkId = href.split('/').filter(Boolean).pop()

            // Exclude trailers (9999 prefix)
            if (!nhkId.startsWith('9999')) {
              items.push({
                title: link.textContent.trim(),
                url: href,
                nhkId: nhkId,
                index,
              })
            }
          }
        })
      return items
    })

    // Sort by NHK ID in descending order (newest first)
    episodes.sort((a, b) => b.nhkId.localeCompare(a.nhkId))

    // Save results
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const metadataDir = path.join(__dirname, 'metadata')
    await fs.ensureDir(metadataDir)

    const outputFile = path.join(
      metadataDir,
      `episode_scrape_${timestamp}.json`
    )
    await fs.writeJson(
      outputFile,
      {
        url,
        timestamp,
        episodeCount: episodes.length,
        episodes,
      },
      { spaces: 2 }
    )

    console.log(
      chalk.green(`✅ Found ${episodes.length} episodes (excluding trailers)`)
    )
    console.log(chalk.gray('Results saved to:'), outputFile)

    return outputFile // Return file path for check-missing script
  } catch (error) {
    console.error(chalk.red('❌ Failed to scrape episodes:'), error.message)
    if (browser) await browser.close()
    throw error
  }
}

// Run the scraper
const showUrl = 'https://www3.nhk.or.jp/nhkworld/en/shows/journeys/'

;(async () => {
  try {
    await scrapeEpisodes(showUrl)
  } catch (error) {
    console.error('Script failed:', error)
    process.exit(1)
  }
})()
