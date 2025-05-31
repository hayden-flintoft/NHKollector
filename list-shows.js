#!/usr/bin/env node
const fs = require('fs-extra')
const path = require('path')
const chalk = require('chalk')

const SHOWS_CONFIG = path.join(__dirname, 'config', 'shows.json')

function pad(str, len) {
  str = String(str)
  return str.length >= len ? str.slice(0, len - 1) + '…' : str + ' '.repeat(len - str.length)
}

async function main() {
  try {
    if (!await fs.pathExists(SHOWS_CONFIG)) {
      console.log(chalk.red('No shows.json found.'))
      process.exit(1)
    }
    const shows = await fs.readJSON(SHOWS_CONFIG)
    if (!Array.isArray(shows) || shows.length === 0) {
      console.log(chalk.yellow('No shows found.'))
      process.exit(0)
    }

    // Calculate column widths
    const idxWidth = Math.max(5, String(shows.length).length + 2)
    const nameWidth = Math.max(16, ...shows.map(s => s.name.length + 2))
    const nhkWidth = Math.max(32, ...shows.map(s => (s.nhkUrl || '').length + 2))
    const tvdbWidth = Math.max(32, ...shows.map(s => (s.tvdbUrl || '').length + 2))

    const border = chalk.blue('+' + '-'.repeat(idxWidth) + '+' + '-'.repeat(nameWidth) + '+' + '-'.repeat(nhkWidth) + '+' + '-'.repeat(tvdbWidth) + '+')
    const header =
      chalk.blue('|') +
      chalk.yellow(pad('#', idxWidth)) + chalk.blue('|') +
      chalk.green(pad('Show Name', nameWidth)) + chalk.blue('|') +
      chalk.cyan(pad('NHK URL', nhkWidth)) + chalk.blue('|') +
      chalk.magenta(pad('TVDB URL', tvdbWidth)) + chalk.blue('|')

    console.log(border)
    console.log(header)
    console.log(border)
    shows.forEach((show, idx) => {
      console.log(
        chalk.blue('|') +
        chalk.yellow(pad(idx + 1, idxWidth)) + chalk.blue('|') +
        chalk.green(pad(show.name, nameWidth)) + chalk.blue('|') +
        chalk.cyan(pad(show.nhkUrl, nhkWidth)) + chalk.blue('|') +
        chalk.magenta(pad(show.tvdbUrl, tvdbWidth)) + chalk.blue('|')
      )
    })
    console.log(border)
  } catch (err) {
    console.error(chalk.red('Error:'), err.message)
    process.exit(1)
  }
}

if (require.main === module) main()
module.exports = main