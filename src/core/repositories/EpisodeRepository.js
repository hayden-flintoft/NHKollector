// filepath: /home/hflin/nhktool/src/core/repositories/EpisodeRepository.js
const BaseRepository = require('./BaseRepository');

/**
 * Episode Repository Interface
 * Extends BaseRepository with Episode-specific operations
 */
class EpisodeRepository extends BaseRepository {
  /**
   * Find an episode by NHK ID
   * @param {string} nhkId - Episode NHK ID
   * @returns {Promise<Object|null>}
   */
  async findByNhkId(nhkId) {
    throw new Error('Method not implemented');
  }

  /**
   * Get episodes by show name
   * @param {string} showName - Show name
   * @returns {Promise<Array>}
   */
  async getByShow(showName) {
    throw new Error('Method not implemented');
  }
  
  /**
   * Find an episode by Sonarr ID
   * @param {number} sonarrEpisodeId - Sonarr episode ID
   * @returns {Promise<Object|null>}
   */
  async findBySonarrId(sonarrEpisodeId) {
    throw new Error('Method not implemented');
  }
  
  /**
   * Get downloaded episodes
   * @returns {Promise<Array>}
   */
  async getDownloaded() {
    throw new Error('Method not implemented');
  }
  
  /**
   * Get episodes with download errors
   * @returns {Promise<Array>}
   */
  async getWithErrors() {
    throw new Error('Method not implemented');
  }
  
  /**
   * Update episode download status
   * @param {string} nhkId - Episode NHK ID
   * @param {Object} downloadStatus - Download status object
   * @returns {Promise<Object>} - Updated episode
   */
  async updateDownloadStatus(nhkId, downloadStatus) {
    throw new Error('Method not implemented');
  }
  
  /**
   * Update episode Sonarr metadata
   * @param {string} nhkId - Episode NHK ID
   * @param {Object} sonarrData - Sonarr metadata
   * @returns {Promise<Object>} - Updated episode
   */
  async updateSonarrData(nhkId, sonarrData) {
    throw new Error('Method not implemented');
  }
}

module.exports = EpisodeRepository;