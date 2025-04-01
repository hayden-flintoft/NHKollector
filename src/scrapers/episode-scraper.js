const puppeteer = require('puppeteer')
const chalk = require('chalk')

const debugLog = (msg) => console.log(chalk.gray(`🔍 [DEBUG] ${msg}`))

/**
 * Scrapes episodes from an NHK World show page
 * @param {string} url - The show's URL
 * @returns {Promise<Array>} Array of episode objects
 */
async function scrapeEpisodes(url) {
  let browser
  try {
    debugLog(`Scraping episodes from: ${url}`)
    const showName = url.split('/').filter(Boolean).pop()

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
    await page.goto(url, { waitUntil: 'networkidle0' })
    await page.waitForSelector('.tItemListEpisode__list', { timeout: 10000 })

    // Click "See More" until no more button
    let hasMoreEpisodes = true
    while (hasMoreEpisodes) {
      try {
        const moreButton = await page.$('.pBtnMore.tItemListEpisode__more')
        if (moreButton) {
          await moreButton.click()
          await page.waitForTimeout(1000)
          await page.waitForNetworkIdle({ timeout: 5000 })
        } else {
          hasMoreEpisodes = false
        }
      } catch (error) {
        hasMoreEpisodes = false
      }
    }

    // Get all episodes
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
              })
            }
          }
        })
      return items
    })

    // Sort by NHK ID and add show name
    return episodes
      .sort((a, b) => b.nhkId.localeCompare(a.nhkId))
      .map((episode) => ({
        show: showName,
        ...episode,
      }))
  } catch (error) {
    console.error(chalk.red(`Failed to scrape episodes: ${error.message}`))
    throw error
  } finally {
    if (browser) await browser.close()
  }
}

module.exports = scrapeEpisodes
