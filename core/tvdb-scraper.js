const puppeteer = require('puppeteer')
const chalk = require('chalk')
const fs = require('fs-extra')
const path = require('path')

class TVDBScraper {
  constructor() {
    this.cacheFile = path.join(process.cwd(), 'data', 'tvdb-cache.json')
    this.cache = { episodes: {} }
    this.browser = null
  }

  async init() {
    await fs.ensureDir(path.dirname(this.cacheFile))
    try {
      this.cache = await fs.readJSON(this.cacheFile)
    } catch (error) {
      await this.saveCache() // Create new cache file if doesn't exist
    }
  }

  async saveCache() {
    await fs.writeJSON(this.cacheFile, this.cache, { spaces: 2 })
  }

  getShowSlug(url) {
    const match = url.match(/series\/([^/#]+)/)
    return match ? match[1] : null
  }

  getCachedEpisode(showSlug, episodeTitle) {
    return this.cache.episodes[showSlug]?.[episodeTitle] || null
  }

  async cacheEpisode(showSlug, episodeTitle, seasonEpisode) {
    if (!this.cache.episodes[showSlug]) {
      this.cache.episodes[showSlug] = {}
    }
    this.cache.episodes[showSlug][episodeTitle] = seasonEpisode
    await this.saveCache()
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close()
      this.browser = null
    }
  }

  async findEpisodeInfo(showUrl, episodeTitle, options = {}) {
    await this.init()
    
    const showSlug = this.getShowSlug(showUrl)
    if (!showSlug) {
      console.error(chalk.red('Invalid show URL format'))
      return null
    }

    const cachedResult = this.getCachedEpisode(showSlug, episodeTitle)
    if (cachedResult) {
      console.log(chalk.blue('📎 Found in cache:', cachedResult))
      return cachedResult
    }

    let page = null
    try {
      this.browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage'
        ]
      })

      page = await this.browser.newPage()
      
      // Improved request interception
      await page.setRequestInterception(true)
      page.on('request', request => {
        if (request.resourceType() === 'document') {
          request.continue()
        } else if (request.resourceType() === 'script') {
          // Only allow essential scripts
          const url = request.url()
          if (url.includes('thetvdb.com')) {
            request.continue()
          } else {
            request.abort()
          }
        } else {
          request.abort()
        }
      })

      // Suppress browser console errors
      page.on('console', msg => {
        if (msg.type() === 'error' && !msg.text().includes('net::ERR_FAILED')) {
          console.error(chalk.gray('Browser error:', msg.text()))
        }
      })

      // TVDB response handling
      page.on('response', async response => {
        const status = response.status()
        if (status === 403 || status === 429) {
          console.error(chalk.red(`⚠️ TVDB returned ${status} - possible rate limiting or blocking`))
          
          // Save response body for debugging
          const text = await response.text()
          fs.writeFileSync('tvdb-error-response.html', text)
          
          throw new Error(`TVDB returned ${status}`)
        }
      })

      // Set navigation options
      const pageOptions = {
        waitUntil: 'domcontentloaded',
        timeout: options.timeout || 15000
      }

      // After page.goto, add a retry mechanism:
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        try {
          await page.goto(showUrl, pageOptions)
          
          // Wait explicitly for episode content
          await page.waitForSelector('#app .container a[href*="/episodes/"]', {
            timeout: options.timeout || 15000
          })
          
          // Add debug snapshot of initial episode data
          const initialEpisodes = await page.evaluate(() => {
            const links = document.querySelectorAll('#app .container a[href*="/episodes/"]')
            return Array.from(links).map(link => ({
              title: link.textContent.trim(),
              href: link.getAttribute('href')
            }))
          })
          console.log(chalk.gray('\nInitial episodes found:'))
          initialEpisodes.forEach(ep => console.log(chalk.gray(`- ${ep.title} (${ep.href})`)))
          
          // Check if page contains episodes
          const episodeCount = await page.evaluate(() => {
            return document.querySelectorAll('#app .container a[href*="/episodes/"]').length
          })

          if (episodeCount > 0) {
            console.log(chalk.gray(`✅ Page loaded with ${episodeCount} episodes`))
            break
          }

          console.log(chalk.yellow(`Retry ${retryCount + 1}/${maxRetries}: No episodes found, waiting...`))
          await page.waitForTimeout(2000) // Wait 2 seconds between retries
          retryCount++
          
        } catch (error) {
          if (retryCount === maxRetries - 1) {
            throw error
          }
          retryCount++
          console.log(chalk.yellow(`Retry ${retryCount}/${maxRetries}: ${error.message}`))
          await page.waitForTimeout(2000)
        }
      }

      // Check if page contains expected content
      const hasContent = await page.evaluate(() => {
        const container = document.querySelector("#app > div.container")
        return !!container
      })

      if (!hasContent) {
        throw new Error('Page loaded but content not found - possible bot detection')
      }

      console.log(chalk.gray('✅ Page loaded successfully'))

      // Before episode search, add DOM structure check
      const domCheck = await page.evaluate(() => {
        return {
          container: !!document.querySelector('#app .container'),
          lists: document.querySelectorAll('#app .container ul').length,
          links: document.querySelectorAll('a[href*="/episodes/"]').length,
          html: document.querySelector('#app .container')?.innerHTML.substring(0, 200)
        }
      })
      
      console.log(chalk.gray('\nDOM structure check:'))
      console.log(chalk.gray('- Container present:', domCheck.container))
      console.log(chalk.gray('- Episode lists:', domCheck.lists))
      console.log(chalk.gray('- Episode links:', domCheck.links))
      if (!domCheck.links) {
        console.log(chalk.gray('\nContainer HTML preview:'))
        console.log(chalk.gray(domCheck.html))
      }

      // Before episode search, add detailed list inspection
      const episodeList = await page.evaluate(() => {
        const episodes = [];
        const list = document.querySelector("#app > div.container > div.row > div > ul:nth-child(2)");
        
        if (list) {
          const items = list.querySelectorAll('li > h4');
          items.forEach(h4 => {
            const link = h4.querySelector('a');
            const span = h4.querySelector('span');
            if (link && span) {
              episodes.push({
                title: link.textContent.trim(),
                seasonEp: span.textContent.trim(),
                html: h4.innerHTML
              });
            }
          });
        }
        return episodes;
      });

      console.log(chalk.blue('\n📺 Episode list contents:'));
      if (episodeList.length > 0) {
        episodeList.forEach(ep => {
          console.log(chalk.gray(`\n${ep.seasonEp} - ${ep.title}`));
          console.log(chalk.gray(`HTML: ${ep.html}`));
        });
      } else {
        console.log(chalk.yellow('No episodes found in list'));
      }

      // Search for episodes using correct DOM traversal
      const episodeInfo = await page.evaluate((searchTitle) => {
        const normalize = (str) => str.toLowerCase().trim()
          .replace(/[^a-z0-9:\-\s]/g, '')
          .replace(/\s+/g, ' ');

        // Start from the common parent container
        const container = document.querySelector("#app > div.container > div.row > div");
        if (!container) {
          console.log('Container not found');
          return null;
        }

        // Get the episode list (second ul element)
        const episodeList = container.querySelector("ul:nth-child(2)");
        if (!episodeList) {
          console.log('Episode list not found');
          return null;
        }

        const results = [];
        // Get all episode items
        const episodes = episodeList.querySelectorAll("li");
        
        console.log(`Found ${episodes.length} episode elements`);
        
        episodes.forEach((episode, index) => {
          const heading = episode.querySelector("h4");
          if (!heading) return;

          const titleEl = heading.querySelector("a");
          const seasonEpEl = heading.querySelector("span");
          
          if (titleEl && seasonEpEl) {
            const title = titleEl.textContent.trim();
            const seasonEp = seasonEpEl.textContent.trim();
            
            results.push({ title, seasonEp });
            console.log(`Episode ${index + 1}: "${title}" (${seasonEp})`);

            if (normalize(title) === normalize(searchTitle)) {
              console.log(`Match found: ${title} (${seasonEp})`);
              return { title, seasonEpisode: seasonEp };
            }
          }
        });

        // Display all found episodes
        if (results.length > 0) {
          console.log('\nAvailable episodes:');
          results.forEach(ep => console.log(`${ep.seasonEp} - ${ep.title}`));
        } else {
          console.log('No episodes found in list');
        }

        return null;
      }, episodeTitle)

      if (!episodeInfo) {
        // Get all episodes for display
        const episodes = await page.evaluate(() => {
          const episodes = []
          // Find all episode elements
          const links = document.querySelectorAll('#app .container a[href*="/episodes/"]')
          
          for (const link of links) {
            const title = link.textContent.trim()
            // Find closest span with season/episode info
            const seasonEp = link.closest('h4')?.querySelector('span')?.textContent.trim()
            
            if (title && seasonEp) {
              episodes.push({
                title,
                seasonEp,
                url: link.getAttribute('href')
              })
            }
          }
          
          // Sort by season/episode
          return episodes.sort((a, b) => {
            const aMatch = a.seasonEp.match(/S(\d+)E(\d+)/)
            const bMatch = b.seasonEp.match(/S(\d+)E(\d+)/)
            if (!aMatch || !bMatch) return 0
            const [aSeason, aEp] = [parseInt(aMatch[1]), parseInt(aMatch[2])]
            const [bSeason, bEp] = [parseInt(bMatch[1]), parseInt(bMatch[2])]
            return bSeason === aSeason ? bEp - aEp : bSeason - aSeason
          })
        })

        if (episodes.length > 0) {
          console.log(chalk.yellow('\n🔍 No exact match found'))
          console.log(chalk.gray(`Searched for: "${episodeTitle}"`))
          console.log(chalk.blue('\n📺 Available episodes:'))
          
          // Group by season
          const seasons = {}
          episodes.forEach(ep => {
            const season = ep.seasonEp.match(/S(\d+)/)[1]
            if (!seasons[season]) seasons[season] = []
            seasons[season].push(ep)
          })
          
          // Display episodes by season
          Object.entries(seasons).reverse().forEach(([season, eps]) => {
            console.log(chalk.white(`\nSeason ${season}:`))
            eps.forEach(ep => {
              console.log(chalk.gray(`  ${ep.seasonEp} - ${ep.title}`))
            })
          })
        } else {
          console.log(chalk.red('\n❌ No episodes found on page'))
        }
        
        return null
      }

      if (episodeInfo) {
        console.log(chalk.green(`✅ Found episode: ${episodeInfo.title}`))
        console.log(chalk.gray(`   Season/Episode: ${episodeInfo.seasonEpisode}`))
        
        // Cache the result
        await this.cacheEpisode(showSlug, episodeTitle, episodeInfo.seasonEpisode)
        
        return episodeInfo.seasonEpisode
      } else {
        console.log(chalk.yellow(`⚠️ Episode not found: ${episodeTitle}`))
        return null
      }

    } catch (error) {
      console.error(chalk.red('Navigation error:'), error.message)
      // Take error screenshot
      await page.screenshot({ 
        path: 'error-tvdb.png',
        fullPage: true
      })
      throw error
    } finally {
      if (this.browser) {
        await this.cleanup()
      }
    }
  }
}

module.exports = TVDBScraper

// Example usage:
// const scraper = new TVDBScraper()
// scraper.findEpisodeInfo(
//   'https://thetvdb.com/series/journeys-in-japan',
//   'Hida: Deep Winter Escape'
// )