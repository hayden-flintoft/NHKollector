// filepath: /home/hflin/nhktool/src/core/repositories/ShowRepository.js
const BaseRepository = require('./BaseRepository');

/**
 * Show Repository Interface
 * Extends BaseRepository with Show-specific operations
 */
class ShowRepository extends BaseRepository {
  /**
   * Find a show by NHK ID
   * @param {string} nhkId - Show NHK ID
   * @returns {Promise<Object|null>}
   */
  async findByNhkId(nhkId) {
    throw new Error('Method not implemented');
  }

  /**
   * Find a show by name (case-insensitive)
   * @param {string} name - Show name
   * @returns {Promise<Object|null>}
   */
  async findByName(name) {
    throw new Error('Method not implemented');
  }
  
  /**
   * Find a show by Sonarr ID
   * @param {number} sonarrId - Sonarr show ID
   * @returns {Promise<Object|null>}
   */
  async findBySonarrId(sonarrId) {
    throw new Error('Method not implemented');
  }
  
  /**
   * Get all enabled shows
   * @returns {Promise<Array>}
   */
  async getAllEnabled() {
    throw new Error('Method not implemented');
  }
  
  /**
   * Save a show's state
   * @param {string} nhkId - Show NHK ID
   * @param {Object} state - Show state object
   * @returns {Promise<boolean>}
   */
  async saveState(nhkId, state) {
    throw new Error('Method not implemented');
  }
  
  /**
   * Get a show's episodes
   * @param {string} nhkId - Show NHK ID
   * @returns {Promise<Array>}
   */
  async getEpisodes(nhkId) {
    throw new Error('Method not implemented');
  }
  
  /**
   * Save a show's episodes
   * @param {string} nhkId - Show NHK ID
   * @param {Array} episodes - Array of episodes
   * @returns {Promise<boolean>}
   */
  async saveEpisodes(nhkId, episodes) {
    throw new Error('Method not implemented');
  }
}

module.exports = ShowRepository;