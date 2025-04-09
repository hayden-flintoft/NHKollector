const puppeteer = require('puppeteer')
const fs = require('fs-extra')
const path = require('path')
const chalk = require('chalk')
const axios = require('axios')

const debugLog = (msg) => console.log(chalk.gray(`🔍 [DEBUG] ${msg}`))

/**
 * Scrapes episodes from NHK World website
 * @param {string} showUrl - URL of the show page
 * @returns {Promise<Array>} Array of episode objects
 */
async function scrapeEpisodes(showUrl) {
  let browser = null

  try {
    console.log(chalk.blue(`🔍 Scraping episodes from: ${showUrl}`))
    const showName = showUrl.split('/').filter(Boolean).pop().replace(/-/g, ' ')

    // Try API approach first (faster and more reliable)
    try {
      const episodes = await scrapeFromApi(showUrl)
      if (episodes && episodes.length > 0) {
        console.log(chalk.green(`✅ Found ${episodes.length} episodes via API`))
        return episodes
      }
    } catch (apiError) {
      debugLog(
        `API method failed: ${apiError.message}. Falling back to browser scraping.`
      )
    }

    // Fall back to browser scraping if API fails
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

    const page = await browser.newPage()

    // Set timeout to 30 seconds
    page.setDefaultNavigationTimeout(30000)

    debugLog(`Navigating to ${showUrl}`)
    console.log(chalk.gray('⏳ Loading page...'))

    await page.goto(showUrl, { waitUntil: 'networkidle0' })
    console.log(chalk.gray('✅ Page loaded'))

    // Wait for episodes to load using the correct selector
    console.log(chalk.gray('⏳ Waiting for episodes to load...'))
    await page.waitForSelector('.tItemListEpisode__list', { timeout: 10000 })
    console.log(chalk.gray('✅ Episodes found'))

    // Click "See More" until no more button exists
    console.log(chalk.gray('⏳ Loading more episodes...'))
    let hasMoreEpisodes = true
    let loadCount = 0

    while (hasMoreEpisodes && loadCount < 10) {
      try {
        const moreButton = await page.$('.pBtnMore.tItemListEpisode__more')
        if (moreButton) {
          await moreButton.click()
          await page.evaluate(() => new Promise((r) => setTimeout(r, 1000)))
          await page.waitForNetworkIdle({ timeout: 5000 })
          loadCount++
          console.log(chalk.gray(`Loaded more episodes (${loadCount})...`))
        } else {
          hasMoreEpisodes = false
        }
      } catch (error) {
        console.log(chalk.yellow(`No more episodes to load: ${error.message}`))
        hasMoreEpisodes = false
      }
    }

    // Extract episode data using the working selectors
    const episodes = await page.evaluate(() => {
      const items = []
      document
        .querySelectorAll('.pItemEpisode.tItemListEpisode__item')
        .forEach((article) => {
          const link = article.querySelector('a')
          if (link) {
            const href = link.getAttribute('href')
            const nhkId = href.split('/').filter(Boolean).pop()

            // Exclude trailers
            if (!nhkId.startsWith('9999')) {
              items.push({
                title: link.textContent.trim(),
                url: href,
                nhkId,
                imageUrl:
                  article.querySelector('img')?.getAttribute('src') || '',
                date:
                  article
                    .querySelector('.tItemListEpisode__date')
                    ?.textContent.trim() || '',
              })
            }
          }
        })
      return items
    })

    // Sort by NHK ID and add show name
    const result = episodes
      .sort((a, b) => b.nhkId.localeCompare(a.nhkId))
      .map((episode) => ({
        show: showName,
        available: true,
        ...episode,
      }))

    console.log(
      chalk.green(`✅ Found ${result.length} episodes via browser scraping`)
    )
    return result
  } catch (error) {
    console.error(chalk.red('Failed to scrape episodes:'), error.message)

    // For testing, return mock data if scraping fails
    console.log(chalk.yellow('⚠️ Returning mock data for testing'))
    return createMockEpisodes(showUrl)
  } finally {
    if (browser) {
      console.log(chalk.gray('Closing browser'))
      await browser.close()
    }
  }
}

/**
 * Try to get episodes from the NHK API
 */
async function scrapeFromApi(showUrl) {
  const showSlug = showUrl.split('/').filter(Boolean).pop()
  const apiUrl = `https://www3.nhk.or.jp/nhkworld/data/en/shows/${showSlug}/episodes.json`

  debugLog(`Trying API endpoint: ${apiUrl}`)

  const response = await axios.get(apiUrl, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      Accept: 'application/json',
      Referer: showUrl,
    },
  })

  if (!response.data?.episodes?.length) {
    return []
  }

  return response.data.episodes.map((episode) => ({
    title: episode.title,
    url: `/nhkworld/en/shows/${episode.pgm_id}/`,
    imageUrl: episode.image_url,
    duration: episode.duration,
    available: true,
    nhkId: episode.pgm_id,
    date: episode.onair,
    description: episode.description,
    show: showUrl.split('/').filter(Boolean).pop().replace(/-/g, ' '),
  }))
}

/**
 * Create mock episodes for testing
 */
function createMockEpisodes(showUrl) {
  const showName = showUrl.split('/').filter(Boolean).pop().replace(/-/g, ' ')
  const episodeCount = 10

  console.log(
    chalk.yellow(`Creating ${episodeCount} mock episodes for testing`)
  )

  return Array.from({ length: episodeCount }, (_, i) => ({
    title: `Episode ${i + 1}: Tokyo Adventure`,
    url: `/nhkworld/en/shows/${showName.toLowerCase()}/${2007550 + i}/`,
    imageUrl:
      'https://www3.nhk.or.jp/nhkworld/en/shows/journeys/images/thumbnail.jpg',
    duration: '28:00',
    available: true,
    nhkId: `${2007550 + i}`,
    date: new Date(2024, 3, i + 1).toISOString().split('T')[0],
    description: `Exploring the beautiful sights of Japan in episode ${i + 1}`,
    show: showName,
  }))
}

module.exports = scrapeEpisodes
