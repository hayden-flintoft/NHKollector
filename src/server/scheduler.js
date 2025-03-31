// src/server/scheduler.js
const cron = require('node-cron');
const ShowManager = require('./show-manager');
const VideoDownloader = require('./ytdlp-wrapper');
const chalk = require('chalk');

class DownloadScheduler {
  constructor() {
    this.showManager = new ShowManager();
    this.downloader = new VideoDownloader();
    this.sources = {
      'NHK': this._scrapeNHK.bind(this),
      'Default': this._scrapeGeneric.bind(this)
    };
  }

  start() {
    // Run every 6 hours
    cron.schedule('0 */6 * * *', () => this.checkForNewEpisodes());
    console.log(chalk.green('Scheduler started'));
  }

  async checkForNewEpisodes() {
    const shows = this.showManager.getShows();
    
    for (const show of shows) {
      try {
        const episodes = await this.sources[show.source || 'Default'](show.url);
        
        for (const episode of episodes) {
          if (!this.showManager.hasDownloaded(episode.id)) {
            console.log(chalk.blue(`Downloading new episode: ${episode.title}`));
            await this.downloader.downloadEpisode(
              episode.url, 
              show.name, 
              episode
            );
            await this.showManager.markAsDownloaded(episode.id);
          }
        }
      } catch (err) {
        console.error(chalk.red(`Error processing ${show.name}:`), err);
      }
    }
  }

  async _scrapeNHK(url) {
    // Implement NHK-specific scraping logic
    // Return array of { id, title, url, date } objects
  }

  async _scrapeGeneric(url) {
    // Implement generic site scraping
  }
}

module.exports = DownloadScheduler;