// filepath: /home/hflin/nhktool/src/core/models/Show.js
const chalk = require('chalk');

/**
 * Show domain model
 * Represents an NHK show with its metadata and episodes
 */
class Show {
  constructor(data = {}) {
    this.nhkId = data.nhkId;
    this.name = data.name;
    this.url = data.url;
    this.description = data.description || '';
    this.thumbnailUrl = data.thumbnailUrl || '';
    
    // Sonarr metadata
    this.sonarrId = data.sonarrId || null;
    this.sonarrTitle = data.sonarrTitle || this.name;
    this.sonarrPath = data.sonarrPath || null;
    
    // Additional metadata
    this.metadata = data.metadata || {};

    // Runtime state
    this.episodes = data.episodes || [];
    this.state = data.state || {
      enabled: true,
      lastChecked: null,
      lastUpdate: null,
      episodeCount: 0,
      downloads: { total: 0, successful: 0, failed: 0 },
    };
  }

  /**
   * Validate if show has all required fields
   * @throws {Error} If any required field is missing
   */
  validate() {
    if (!this.nhkId) throw new Error('Show nhkId is required');
    if (!this.name) throw new Error('Show name is required');
    if (!this.url) throw new Error('Show URL is required');

    // Validate URL format
    const validUrl = this.url.startsWith(
      'https://www3.nhk.or.jp/nhkworld/en/shows/'
    );
    if (!validUrl) throw new Error('Invalid NHK show URL format');
    
    return true;
  }

  /**
   * Add episode to the show
   * @param {Episode} episode Episode to add
   */
  addEpisode(episode) {
    // Check if episode already exists
    const exists = this.episodes.some(ep => ep.nhkId === episode.nhkId);
    if (!exists) {
      this.episodes.push(episode);
      this.state.episodeCount = this.episodes.length;
      console.log(chalk.cyan(`Added episode "${episode.title}" to show "${this.name}"`));
    }
  }

  /**
   * Find episode by NHK ID
   * @param {string} nhkId NHK episode ID
   * @returns {Episode|null} Found episode or null
   */
  findEpisodeByNhkId(nhkId) {
    return this.episodes.find(ep => ep.nhkId === nhkId) || null;
  }
  
  /**
   * Find episode by Sonarr episode ID
   * @param {number} sonarrEpisodeId Sonarr episode ID
   * @returns {Episode|null} Found episode or null
   */
  findEpisodeBySonarrId(sonarrEpisodeId) {
    return this.episodes.find(
      ep => ep.sonarr && ep.sonarr.id === sonarrEpisodeId
    ) || null;
  }

  /**
   * Update show state
   * @param {Object} updates State properties to update
   */
  updateState(updates = {}) {
    this.state = {
      ...this.state,
      ...updates,
      lastUpdate: new Date()
    };
    
    console.log(chalk.yellow(`Updated state for show "${this.name}"`));
  }
  
  /**
   * Check if show has Sonarr integration enabled
   * @returns {boolean}
   */
  hasSonarrIntegration() {
    return !!this.sonarrId;
  }
  
  /**
   * Convert show to a plain object for serialization
   */
  toJSON() {
    return {
      nhkId: this.nhkId,
      name: this.name,
      url: this.url,
      description: this.description,
      thumbnailUrl: this.thumbnailUrl,
      sonarrId: this.sonarrId,
      sonarrTitle: this.sonarrTitle,
      sonarrPath: this.sonarrPath,
      metadata: this.metadata,
      state: this.state,
      // Don't include episodes in the default serialization
      // to avoid circular references and large objects
    };
  }
  
  /**
   * Convert show to a plain object including episodes
   */
  toJSONWithEpisodes() {
    const json = this.toJSON();
    json.episodes = this.episodes.map(ep => ep.toJSON());
    return json;
  }
}

module.exports = Show;