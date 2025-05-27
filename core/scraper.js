const puppeteer = require('puppeteer')
const chalk = require('chalk')
const Episode = require('./models/episode')

class NHKScraper {
    async scrapeShowEpisodes(url) {
        let browser = null

        try {
            console.log(chalk.blue(`🔍 Scraping episodes from: ${url}`))

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
            page.setDefaultNavigationTimeout(30000)

            console.log(chalk.gray('⏳ Loading page...'))
            await page.goto(url, { waitUntil: 'networkidle0' })
            console.log(chalk.gray('✅ Page loaded'))

            // Get the full show name from the logo first
            const showName = await page.evaluate(() => {
                const logoImg = document.querySelector("#shows_program_hero > div > div.pProgramHero__logo.-logo > div > h1 > picture > img")
                return logoImg ? logoImg.getAttribute('alt') : null
            })

            if (!showName) {
                throw new Error('Could not find show name')
            }

            // Wait for episodes to load
            console.log(chalk.gray('⏳ Waiting for episodes to load...'))
            await page.waitForSelector('.tItemListEpisode__list', { timeout: 10000 })
            console.log(chalk.gray('✅ Episodes found'))

            // Click "See More" until no more episodes
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
                    hasMoreEpisodes = false
                }
            }

            // Only get episodes from the episodes section
            const episodes = await page.evaluate((showTitle) => {
                const items = []
                const episodeContainer = document.querySelector("#shows_program_episodes > div > div")
                
                if (!episodeContainer) return items

                episodeContainer.querySelectorAll('.pItemEpisode.tItemListEpisode__item').forEach((article) => {
                    const link = article.querySelector('a')
                    if (link) {
                        const href = link.getAttribute('href')
                        const title = link.textContent.trim()
                        
                        const dateText = article.querySelector('.tVideoEpisodeHero__date')?.textContent.trim()
                        let airDate = ''
                        if (dateText) {
                            const match = dateText.match(/Broadcast on ([A-Za-z]+ \d{1,2}, \d{4})/)
                            if (match) {
                                const date = new Date(match[1])
                                // Ensure date is in yyyy-mm-dd format with padded months and days
                                const year = date.getFullYear()
                                const month = String(date.getMonth() + 1).padStart(2, '0')
                                const day = String(date.getDate()).padStart(2, '0')
                                airDate = `${year}-${month}-${day}`
                            }
                        }
                        
                        const desc = article.querySelector('.tItemListEpisode__info .tItemListEpisode__desc')?.textContent.trim()
                        const img = article.querySelector('img')?.getAttribute('src')

                        items.push({
                            show: showTitle,
                            title: title,
                            url: href.startsWith('http') ? href : `https://www3.nhk.or.jp${href}`,
                            thumbnailUrl: img || '',
                            airDate: airDate,  // Make sure this is being set from the dateText parsing
                            description: desc || ''
                        })
                    }
                })
                return items
            }, showName)

            console.log(chalk.blue('\n📺 Show Information:'))
            console.log(chalk.gray(`Show Title: ${showName}`))
            console.log(chalk.blue('\n📝 Found Episodes:'))

            const mappedEpisodes = episodes.map((ep, index) => {
                console.log(chalk.gray(`${index + 1}. ${ep.title} (${ep.airDate})`))
                const episode = new Episode({
                    show: showName,
                    title: ep.title,
                    url: ep.url,
                    airDate: ep.airDate,
                    description: ep.description,
                    thumbnailUrl: ep.thumbnailUrl
                })
                episode.validate() // Add validation check
                return episode
            })

            console.log(chalk.green(`\n✅ Found ${mappedEpisodes.length} episodes`))
            return mappedEpisodes

        } catch (error) {
            console.error(chalk.red('Failed to scrape episodes:'), error.message)
            return []
        } finally {
            if (browser) {
                console.log(chalk.gray('Closing browser'))
                await browser.close()
            }
        }
    }
}

module.exports = NHKScraper
