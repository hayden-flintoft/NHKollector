// filepath: /home/hflin/nhktool/src/core/models/Episode.js
const path = require('path');
const chalk = require('chalk');

/**
 * Episode domain model
 * Represents a single episode of an NHK show
 */
class Episode {
  constructor(data = {}) {
    this.nhkId = data.nhkId;
    this.title = data.title;
    this.url = data.url;
    this.show = data.show;
    this.description = data.description || '';
    this.thumbnailUrl = data.thumbnailUrl || '';
    this.publishDate = data.publishDate || null;
    this.duration = data.duration || null;
    
    // Sonarr metadata
    this.sonarr = data.sonarr || null;

    // Download status
    this.downloadStatus = data.downloadStatus || {
      downloaded: false,
      downloadDate: null,
      filePath: null,
      error: null
    };
  }

  /**
   * Validate if episode has all required fields
   * @throws {Error} If any required field is missing
   */
  validate() {
    if (!this.nhkId) throw new Error('Episode nhkId is required');
    if (!this.title) throw new Error('Episode title is required');
    if (!this.url) throw new Error('Episode URL is required');
    if (!this.show) throw new Error('Episode show name is required');
    
    return true;
  }
  
  /**
   * Generate a filename for the downloaded episode
   * Uses Sonarr metadata if available, otherwise uses NHK ID
   * @returns {string} Filename with extension
   */
  toFileName() {
    if (!this.sonarr) {
      return `${this.show}.${this.nhkId}.mp4`;
    }

    // Format: ShowName.S01E02.EpisodeTitle.mp4
    const s = this.sonarr.seasonNumber.toString().padStart(2, '0');
    const e = this.sonarr.episodeNumber.toString().padStart(2, '0');
    const safeName = this.sonarr.title
      ? this.sonarr.title.replace(/[^\w\s-]/g, '')
      : 'Unknown';

    return `${this.show}.S${s}E${e}.${safeName}.mp4`;
  }
  
  /**
   * Get full file path for this episode based on config
   * @param {string} downloadDir Base download directory
   * @returns {string} Full file path
   */
  getFilePath(downloadDir) {
    return path.join(downloadDir, this.show, this.toFileName());
  }
  
  /**
   * Mark episode as downloaded
   * @param {string} filePath Path where the file was saved
   */
  markAsDownloaded(filePath) {
    this.downloadStatus = {
      downloaded: true,
      downloadDate: new Date(),
      filePath: filePath,
      error: null
    };
    console.log(chalk.green(`Episode marked as downloaded: ${this.title}`));
  }
  
  /**
   * Mark episode download as failed
   * @param {Error} error Error that occurred during download
   */
  markAsFailed(error) {
    this.downloadStatus = {
      downloaded: false,
      downloadDate: new Date(),
      filePath: null,
      error: error.message || 'Unknown error'
    };
    console.log(chalk.red(`Episode download failed: ${this.title} - ${error.message}`));
  }
  
  /**
   * Convert episode to a plain object for serialization
   */
  toJSON() {
    return {
      nhkId: this.nhkId,
      title: this.title,
      url: this.url,
      show: this.show,
      description: this.description,
      thumbnailUrl: this.thumbnailUrl,
      publishDate: this.publishDate,
      duration: this.duration,
      sonarr: this.sonarr,
      downloadStatus: this.downloadStatus
    };
  }
}

module.exports = Episode;