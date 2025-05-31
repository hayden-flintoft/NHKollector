const puppeteer = require('puppeteer')
const chalk = require('chalk')

async function main() {
  const url = 'https://thetvdb.com/series/journeys-in-japan/allseasons/official'
  const browser = await puppeteer.launch({
    headless: false, // set to false to see the browser
    slowMo: 100,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--window-size=1920,1080'
    ],
    defaultViewport: {
      width: 1920,
      height: 1080
    }
  })
  const page = await browser.newPage()
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })

  // Wait for episode list to appear
  await page.waitForSelector('h4.list-group-item-heading', { timeout: 20000 })

  // Extract episodes
  const episodes = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('h4.list-group-item-heading')).map(h4 => {
      const title = h4.querySelector('a')?.textContent.trim()
      const seasonEp = h4.querySelector('span')?.textContent.trim()
      return { seasonEp, title }
    }).filter(ep => ep.title && ep.seasonEp)
  })

  // Print results
  episodes.forEach(ep => {
    console.log(chalk.gray(`${ep.seasonEp} - ${ep.title}`))
  })
  console.log(chalk.green(`\n✅ Found ${episodes.length} episodes`))

  await browser.close()
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})