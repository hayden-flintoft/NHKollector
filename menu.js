#!/usr/bin/env node
const readline = require('readline')
const chalk = require('chalk')
const path = require('path')
const fs = require('fs-extra')

// Import scripts
const listShows = require('./list-shows.js')
const addShow = require('./add-show.js')
const deleteShow = require('./delete-show.js')
const SHOWS_CONFIG = path.join(__dirname, 'config', 'shows.json')

// Utility prompt
function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans) }))
}

// Title
function nhkTitle() {
  return (
    chalk.hex('#E70013').bold('NHK') +
    chalk.hex('#3F3A3A').bold('ollector')
  )
}
function printTitle() {
  console.clear()
  console.log('\n' + nhkTitle())
  console.log(chalk.gray('A CLI tool to manage and download NHK World-Japan shows and episodes.\n'))
}

// --- SHOW CRUD ---
async function listShowsMenu() {
  await listShows()
  await prompt(chalk.gray('\nPress Enter to continue...'))
}
async function addShowMenu() {
  await addShow()
  await prompt(chalk.gray('\nPress Enter to continue...'))
}
async function deleteShowMenu() {
  await deleteShow()
  await prompt(chalk.gray('\nPress Enter to continue...'))
}
async function editShowMenu() {
  // List shows
  const shows = await fs.readJSON(SHOWS_CONFIG)
  if (!shows.length) {
    console.log(chalk.yellow('No shows to edit.'))
    await prompt(chalk.gray('\nPress Enter to continue...'))
    return
  }
  shows.forEach((show, idx) => {
    console.log(chalk.yellow(`[${idx + 1}]`) + ' - ' + chalk.green(show.name))
  })
  const input = await prompt('\nEnter index to edit (ESC to cancel): ')
  if (input.trim().toLowerCase() === 'esc') return
  const idx = parseInt(input, 10) - 1
  if (isNaN(idx) || idx < 0 || idx >= shows.length) {
    console.log(chalk.red('Invalid index.'))
    await prompt(chalk.gray('\nPress Enter to continue...'))
    return
  }
  const show = shows[idx]
  console.log(chalk.blue(`Editing "${show.name}"`))
  const newPath = await prompt(`New download path [${show.videoSettings.downloadPath}] (ESC to cancel): `)
  if (newPath.trim().toLowerCase() === 'esc') return
  if (newPath.trim()) show.videoSettings.downloadPath = newPath.trim()
  await fs.writeJSON(SHOWS_CONFIG, shows, { spaces: 2 })
  console.log(chalk.green('Show updated.'))
  await prompt(chalk.gray('\nPress Enter to continue...'))
}

// --- EPISODE CRUD ---
async function listEpisodesMenu(showIdx) {
  const shows = await fs.readJSON(SHOWS_CONFIG)
  const show = shows[showIdx]
  // Placeholder: Replace with real episode listing
  console.log(chalk.blue(`\nEpisodes for ${show.name}:`))
  console.log(chalk.gray('[1] Example Episode 1\n[2] Example Episode 2'))
  await prompt(chalk.gray('\nPress Enter to continue...'))
}
async function addEpisodeMenu(showIdx) {
  // Placeholder: Implement add episode logic
  console.log(chalk.gray('\n[Add episode not yet implemented]'))
  await prompt(chalk.gray('\nPress Enter to continue...'))
}
async function editEpisodeMenu(showIdx) {
  // Placeholder: Implement edit episode logic
  console.log(chalk.gray('\n[Edit episode not yet implemented]'))
  await prompt(chalk.gray('\nPress Enter to continue...'))
}
async function deleteEpisodeMenu(showIdx) {
  // Placeholder: Implement delete episode logic
  console.log(chalk.gray('\n[Delete episode not yet implemented]'))
  await prompt(chalk.gray('\nPress Enter to continue...'))
}

// --- SEASON CRUD ---
async function listSeasonsMenu(showIdx) {
  // Placeholder: Implement list seasons logic
  console.log(chalk.gray('\n[List seasons not yet implemented]'))
  await prompt(chalk.gray('\nPress Enter to continue...'))
}
async function addSeasonMenu(showIdx) {
  // Placeholder: Implement add season logic
  console.log(chalk.gray('\n[Add season not yet implemented]'))
  await prompt(chalk.gray('\nPress Enter to continue...'))
}
async function editSeasonMenu(showIdx) {
  // Placeholder: Implement edit season logic
  console.log(chalk.gray('\n[Edit season not yet implemented]'))
  await prompt(chalk.gray('\nPress Enter to continue...'))
}
async function deleteSeasonMenu(showIdx) {
  // Placeholder: Implement delete season logic
  console.log(chalk.gray('\n[Delete season not yet implemented]'))
  await prompt(chalk.gray('\nPress Enter to continue...'))
}

// --- SHOWS MENU ---
async function manageShowsMenu() {
  while (true) {
    printTitle()
    console.log(chalk.blue('Manage Shows'))
    console.log(chalk.yellow('[1]') + ' - List shows')
    console.log(chalk.yellow('[2]') + ' - Add show')
    console.log(chalk.yellow('[3]') + ' - Edit show download directory')
    console.log(chalk.yellow('[4]') + ' - Delete show')
    console.log(chalk.yellow('[5]') + ' - Select show for episode/season management')
    console.log(chalk.yellow('[0]') + ' - Return to Main Menu')
    console.log(chalk.yellow('[Q]') + ' - Quit\n')
    const choice = (await prompt('Select an option: ')).trim().toUpperCase()
    if (choice === '1') await listShowsMenu()
    else if (choice === '2') await addShowMenu()
    else if (choice === '3') await editShowMenu()
    else if (choice === '4') await deleteShowMenu()
    else if (choice === '5') {
      // List shows and select
      const shows = await fs.readJSON(SHOWS_CONFIG)
      if (!shows.length) {
        console.log(chalk.yellow('No shows available.'))
        await prompt(chalk.gray('\nPress Enter to continue...'))
        continue
      }
      shows.forEach((show, idx) => {
        console.log(chalk.yellow(`[${idx + 1}]`) + ' - ' + chalk.green(show.name))
      })
      const input = await prompt('\nEnter show index (ESC to cancel): ')
      if (input.trim().toLowerCase() === 'esc') continue
      const idx = parseInt(input, 10) - 1
      if (isNaN(idx) || idx < 0 || idx >= shows.length) {
        console.log(chalk.red('Invalid index.'))
        await prompt(chalk.gray('\nPress Enter to continue...'))
        continue
      }
      await manageShowDetailMenu(idx)
    }
    else if (choice === '0') return
    else if (choice === 'Q') {
      console.log(chalk.green('\nGoodbye!'))
      process.exit(0)
    }
  }
}

// --- SHOW DETAIL MENU (EPISODES/SEASONS) ---
async function manageShowDetailMenu(showIdx) {
  while (true) {
    printTitle()
    const shows = await fs.readJSON(SHOWS_CONFIG)
    const show = shows[showIdx]
    console.log(chalk.blue(`Show: `) + chalk.green(show.name))
    console.log(chalk.yellow('[1]') + ' - List episodes')
    console.log(chalk.yellow('[2]') + ' - Add episode')
    console.log(chalk.yellow('[3]') + ' - Edit episode')
    console.log(chalk.yellow('[4]') + ' - Delete episode')
    console.log(chalk.yellow('[5]') + ' - List seasons')
    console.log(chalk.yellow('[6]') + ' - Add season')
    console.log(chalk.yellow('[7]') + ' - Edit season')
    console.log(chalk.yellow('[8]') + ' - Delete season')
    console.log(chalk.yellow('[0]') + ' - Return to Shows Menu')
    console.log(chalk.yellow('[Q]') + ' - Quit\n')
    const choice = (await prompt('Select an option: ')).trim().toUpperCase()
    if (choice === '1') await listEpisodesMenu(showIdx)
    else if (choice === '2') await addEpisodeMenu(showIdx)
    else if (choice === '3') await editEpisodeMenu(showIdx)
    else if (choice === '4') await deleteEpisodeMenu(showIdx)
    else if (choice === '5') await listSeasonsMenu(showIdx)
    else if (choice === '6') await addSeasonMenu(showIdx)
    else if (choice === '7') await editSeasonMenu(showIdx)
    else if (choice === '8') await deleteSeasonMenu(showIdx)
    else if (choice === '0') return
    else if (choice === 'Q') {
      console.log(chalk.green('\nGoodbye!'))
      process.exit(0)
    }
  }
}

// --- MAIN MENU ---
async function mainMenu() {
  while (true) {
    printTitle()
    console.log(chalk.blue('Main Menu'))
    console.log(chalk.yellow('[1]') + ' - Run downloader')
    console.log(chalk.yellow('[2]') + ' - Manage Shows')
    console.log(chalk.yellow('[Q]') + ' - Quit\n')
    const choice = (await prompt('Select an option: ')).trim().toUpperCase()
    if (choice === '1') {
      await runDownloader()
      await prompt(chalk.gray('\nPress Enter to continue...'))
    } else if (choice === '2') {
      await manageShowsMenu()
    } else if (choice === 'Q') {
      console.log(chalk.green('\nGoodbye!'))
      process.exit(0)
    }
  }
}

// --- Placeholder for downloader ---
async function runDownloader() {
  console.log(chalk.gray('\n[Downloader would run here]'))
}

// Entry point
if (require.main === module) {
  mainMenu()
}

module.exports = mainMenu