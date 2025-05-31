#!/usr/bin/env node
const fs = require('fs-extra')
const path = require('path')
const readline = require('readline')
const chalk = require('chalk')

const SHOWS_CONFIG = path.join(__dirname, 'config', 'shows.json')

async function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans) }))
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
      console.log(chalk.yellow('No shows to delete.'))
      process.exit(0)
    }

    // List shows
    console.log(chalk.blue('\nAvailable shows:'))
    shows.forEach((show, idx) => {
      console.log(chalk.gray(`[${idx + 1}] ${show.name}`))
    })

    // Prompt for index
    let index
    while (true) {
      const input = await prompt('\nEnter the index number of the show to delete: ')
      index = parseInt(input, 10)
      if (index >= 1 && index <= shows.length) break
      console.log(chalk.red('Invalid index. Please try again.'))
    }

    const showToDelete = shows[index - 1]
    // Confirm
    const confirm = await prompt(
      chalk.yellow(`Are you sure you want to delete "${showToDelete.name}"? (Y/N): `)
    )
    if (confirm.trim().toLowerCase() !== 'y') {
      console.log(chalk.blue('Cancelled. No changes made.'))
      process.exit(0)
    }

    // Delete and save
    shows.splice(index - 1, 1)
    await fs.writeJSON(SHOWS_CONFIG, shows, { spaces: 2 })
    console.log(chalk.green(`\n✅ Deleted "${showToDelete.name}" from shows.json.`))
  } catch (err) {
    console.error(chalk.red('Error:'), err.message)
    process.exit(1)
  }
}

if (require.main === module) main()