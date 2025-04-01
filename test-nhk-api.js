require('dotenv').config()
const axios = require('axios')
const chalk = require('chalk')
const fs = require('fs-extra')
const path = require('path')
const { Translator } = require('deepl-node')

const debugLog = (msg) => console.log(chalk.gray(`🔍 [DEBUG] ${msg}`))

// Load monitored shows from config
const monitoredShows = fs.readJsonSync(
  path.join(__dirname, 'src/config/shows.json')
)

async function translateAndSave(text, type) {
  if (!process.env.DEEPL_API_KEY || !text) {
    return text
  }

  try {
    const translator = new Translator(process.env.DEEPL_API_KEY)
    const result = await translator.translateText(text, null, 'en-US')

    return {
      original: text,
      translated: result.text,
      type: type,
      timestamp: new Date().toISOString(),
    }
  } catch (error) {
    debugLog(`Translation failed: ${error.message}`)
    return {
      original: text,
      error: error.message,
      type: type,
      timestamp: new Date().toISOString(),
    }
  }
}

async function testNHKAPI() {
  try {
    const baseUrl = 'https://api.nhk.or.jp/v2'
    const area = '130' // Tokyo
    const service = 'g1' // NHK General
    const date = new Date().toISOString().split('T')[0]
    const apiKey = process.env.NHK_API_KEY

    const url = `${baseUrl}/pg/list/${area}/${service}/${date}.json?key=${apiKey}`
    console.log(chalk.blue('🔍 Testing NHK API...'))
    debugLog(`URL: ${url}`)

    const response = await axios.get(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'NHKTool/1.0',
      },
    })

    // Track found shows
    const foundShows = []
    const translations = []

    if (response.data?.list?.[service]) {
      const programs = response.data.list[service]

      // Search for monitored shows
      for (const program of programs) {
        for (const show of monitoredShows) {
          if (
            program.title.includes(show.name) ||
            program.title.toLowerCase().includes(show.name.toLowerCase())
          ) {
            foundShows.push({
              nhkId: show.nhkId,
              name: show.name,
              programInfo: {
                id: program.id,
                title: program.title,
                start: program.start_time,
                end: program.end_time,
                subtitle: program.subtitle,
                content: program.content,
              },
            })

            // Queue translations
            translations.push(await translateAndSave(program.title, 'title'))
            if (program.subtitle) {
              translations.push(
                await translateAndSave(program.subtitle, 'subtitle')
              )
            }
            if (program.content) {
              translations.push(
                await translateAndSave(program.content, 'content')
              )
            }
          }
        }
      }
    }

    // Save results
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')

    // Save full API response
    await fs.writeJson(
      path.join(__dirname, `debug-nhk-api-${timestamp}.json`),
      response.data,
      { spaces: 2 }
    )

    // Save monitored shows found
    if (foundShows.length > 0) {
      await fs.writeJson(
        path.join(__dirname, `debug-found-shows-${timestamp}.json`),
        {
          shows: foundShows,
          translations: translations,
        },
        { spaces: 2 }
      )

      console.log(chalk.green(`✅ Found ${foundShows.length} monitored shows:`))
      foundShows.forEach((show) => {
        console.log(chalk.gray('\n-------------------'))
        console.log(chalk.gray('Show:'), show.name)
        console.log(chalk.gray('Time:'), show.programInfo.start)
        console.log(chalk.gray('Title:'), show.programInfo.title)
      })
    } else {
      console.log(chalk.yellow('⚠️ No monitored shows found in schedule'))
    }
  } catch (error) {
    console.error(chalk.red('❌ API test failed:'), error.message)
    if (error.response) {
      debugLog(`Status: ${error.response.status}`)
      debugLog(`Message: ${JSON.stringify(error.response.data, null, 2)}`)
    }
  }
}

testNHKAPI()
