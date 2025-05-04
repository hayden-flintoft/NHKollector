// filepath: /home/hflin/nhktool/src/infrastructure/api/SonarrApiClient.js
const axios = require('axios');
const chalk = require('chalk');

/**
 * Client for interacting with Sonarr API
 */
class SonarrApiClient {
  /**
   * Constructor
   * @param {Object} options Configuration options
   * @param {string} options.baseUrl Base URL for Sonarr API
   * @param {string} options.apiKey Sonarr API key
   */
  constructor(options = {}) {
    if (!options.baseUrl) throw new Error('Sonarr baseUrl is required');
    if (!options.apiKey) throw new Error('Sonarr apiKey is required');
    
    this.baseUrl = options.baseUrl;
    this.apiKey = options.apiKey;
    
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'X-Api-Key': this.apiKey,
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Test the connection to Sonarr
   * @returns {Promise<boolean>}
   */
  async testConnection() {
    try {
      console.log(chalk.blue('Testing connection to Sonarr API...'));
      const response = await this.client.get('/api/v3/system/status');
      
      if (response.status === 200) {
        console.log(chalk.green(`Successfully connected to Sonarr ${response.data.version}`));
        return true;
      }
      
      return false;
    } catch (error) {
      console.error(chalk.red(`Failed to connect to Sonarr: ${error.message}`));
      return false;
    }
  }

  /**
   * Get all series from Sonarr
   * @returns {Promise<Array>} List of series
   */
  async getSeries() {
    try {
      console.log(chalk.blue('Fetching all series from Sonarr...'));
      const response = await this.client.get('/api/v3/series');
      
      if (!response.data) {
        throw new Error('Invalid response from Sonarr API');
      }
      
      console.log(chalk.green(`Fetched ${response.data.length} series from Sonarr`));
      return response.data;
    } catch (error) {
      console.error(chalk.red(`Error fetching series from Sonarr: ${error.message}`));
      throw error;
    }
  }

  /**
   * Get a specific series by ID
   * @param {number} id Sonarr series ID
   * @returns {Promise<Object>}
   */
  async getSeriesById(id) {
    try {
      console.log(chalk.blue(`Fetching series with ID ${id} from Sonarr...`));
      const response = await this.client.get(`/api/v3/series/${id}`);
      
      if (!response.data) {
        throw new Error(`Series with ID ${id} not found`);
      }
      
      console.log(chalk.green(`Fetched series: ${response.data.title}`));
      return response.data;
    } catch (error) {
      console.error(chalk.red(`Error fetching series by ID: ${error.message}`));
      throw error;
    }
  }

  /**
   * Search for series by title
   * @param {string} title Series title to search for
   * @returns {Promise<Array>}
   */
  async searchSeries(title) {
    try {
      console.log(chalk.blue(`Searching for series "${title}" in Sonarr...`));
      const response = await this.client.get('/api/v3/series/lookup', {
        params: { term: title }
      });
      
      if (!response.data) {
        return [];
      }
      
      console.log(chalk.green(`Found ${response.data.length} series matching "${title}"`));
      return response.data;
    } catch (error) {
      console.error(chalk.red(`Error searching for series: ${error.message}`));
      throw error;
    }
  }

  /**
   * Add a series to Sonarr
   * @param {Object} seriesData Series data
   * @returns {Promise<Object>}
   */
  async addSeries(seriesData) {
    try {
      console.log(chalk.blue(`Adding series "${seriesData.title}" to Sonarr...`));
      
      // Ensure required fields
      const seriesPayload = {
        tvdbId: seriesData.tvdbId,
        title: seriesData.title,
        titleSlug: seriesData.titleSlug,
        monitored: true,
        seasonFolder: true,
        rootFolderPath: seriesData.rootFolderPath,
        qualityProfileId: seriesData.qualityProfileId,
        languageProfileId: seriesData.languageProfileId || 1,
        addOptions: {
          searchForMissingEpisodes: true
        }
      };
      
      const response = await this.client.post('/api/v3/series', seriesPayload);
      
      if (!response.data) {
        throw new Error(`Failed to add series "${seriesData.title}"`);
      }
      
      console.log(chalk.green(`Added series "${response.data.title}" to Sonarr with ID ${response.data.id}`));
      return response.data;
    } catch (error) {
      console.error(chalk.red(`Error adding series to Sonarr: ${error.message}`));
      throw error;
    }
  }

  /**
   * Get episodes for a series
   * @param {number} seriesId Sonarr series ID
   * @returns {Promise<Array>}
   */
  async getEpisodes(seriesId) {
    try {
      console.log(chalk.blue(`Fetching episodes for series ID ${seriesId}...`));
      const response = await this.client.get('/api/v3/episode', {
        params: { seriesId }
      });
      
      if (!response.data) {
        throw new Error(`Failed to get episodes for series ID ${seriesId}`);
      }
      
      console.log(chalk.green(`Fetched ${response.data.length} episodes for series ID ${seriesId}`));
      return response.data;
    } catch (error) {
      console.error(chalk.red(`Error fetching episodes: ${error.message}`));
      throw error;
    }
  }

  /**
   * Get episode file details
   * @param {number} episodeFileId Sonarr episode file ID
   * @returns {Promise<Object>}
   */
  async getEpisodeFile(episodeFileId) {
    try {
      console.log(chalk.blue(`Fetching episode file with ID ${episodeFileId}...`));
      const response = await this.client.get(`/api/v3/episodefile/${episodeFileId}`);
      
      if (!response.data) {
        throw new Error(`Episode file with ID ${episodeFileId} not found`);
      }
      
      return response.data;
    } catch (error) {
      console.error(chalk.red(`Error fetching episode file: ${error.message}`));
      throw error;
    }
  }

  /**
   * Update an episode file
   * @param {number} episodeFileId Episode file ID
   * @param {Object} updateData Update data
   * @returns {Promise<Object>}
   */
  async updateEpisodeFile(episodeFileId, updateData) {
    try {
      console.log(chalk.blue(`Updating episode file with ID ${episodeFileId}...`));
      const response = await this.client.put(`/api/v3/episodefile/${episodeFileId}`, updateData);
      
      if (!response.data) {
        throw new Error(`Failed to update episode file with ID ${episodeFileId}`);
      }
      
      console.log(chalk.green(`Updated episode file with ID ${episodeFileId}`));
      return response.data;
    } catch (error) {
      console.error(chalk.red(`Error updating episode file: ${error.message}`));
      throw error;
    }
  }
  
  /**
   * Import an episode file
   * @param {Object} importData Import file data
   * @returns {Promise<Object>}
   */
  async importEpisodeFile(importData) {
    try {
      console.log(chalk.blue(`Importing episode file for series ID ${importData.seriesId}...`));
      
      const importPayload = {
        episodeId: importData.episodeId,
        seriesId: importData.seriesId,
        path: importData.path,
        folderName: importData.folderName || path.dirname(importData.path),
        quality: importData.quality || { quality: { id: 1, name: "Unknown" } },
        disableReleaseSwitching: false,
      };
      
      const response = await this.client.post('/api/v3/episodefile/import', importPayload);
      
      if (!response.data) {
        throw new Error(`Failed to import episode file for series ID ${importData.seriesId}`);
      }
      
      console.log(chalk.green(`Imported episode file for episode ID ${importData.episodeId}`));
      return response.data;
    } catch (error) {
      console.error(chalk.red(`Error importing episode file: ${error.message}`));
      throw error;
    }
  }
  
  /**
   * Get all quality profiles
   * @returns {Promise<Array>}
   */
  async getQualityProfiles() {
    try {
      console.log(chalk.blue('Fetching quality profiles from Sonarr...'));
      const response = await this.client.get('/api/v3/qualityprofile');
      
      if (!response.data) {
        throw new Error('Failed to get quality profiles');
      }
      
      console.log(chalk.green(`Fetched ${response.data.length} quality profiles`));
      return response.data;
    } catch (error) {
      console.error(chalk.red(`Error fetching quality profiles: ${error.message}`));
      throw error;
    }
  }
  
  /**
   * Get all root folders
   * @returns {Promise<Array>}
   */
  async getRootFolders() {
    try {
      console.log(chalk.blue('Fetching root folders from Sonarr...'));
      const response = await this.client.get('/api/v3/rootfolder');
      
      if (!response.data) {
        throw new Error('Failed to get root folders');
      }
      
      console.log(chalk.green(`Fetched ${response.data.length} root folders`));
      return response.data;
    } catch (error) {
      console.error(chalk.red(`Error fetching root folders: ${error.message}`));
      throw error;
    }
  }
}

module.exports = SonarrApiClient;