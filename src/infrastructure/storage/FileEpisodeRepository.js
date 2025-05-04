// filepath: /home/hflin/nhktool/src/infrastructure/storage/FileEpisodeRepository.js
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const EpisodeRepository = require('../../core/repositories/EpisodeRepository');
const Episode = require('../../core/models/Episode');

/**
 * File-based implementation of the EpisodeRepository
 */
class FileEpisodeRepository extends EpisodeRepository {
  /**
   * Constructor
   * @param {Object} options Configuration options
   * @param {string} options.dataDir Base directory for data storage
   */
  constructor(options = {}) {
    super();
    this.dataDir = options.dataDir || path.join(process.cwd(), 'data', 'episodes');
    this.showsDir = options.showsDir || path.join(process.cwd(), 'data', 'shows');
  }

  /**
   * Initialize the repository
   * @returns {Promise<void>}
   */
  async initialize() {
    await fs.ensureDir(this.dataDir);
    console.log(chalk.green(`Episode repository initialized at ${this.dataDir}`));
  }

  /**
   * Get all episodes
   * @returns {Promise<Array<Episode>>}
   */
  async getAll() {
    try {
      const episodes = [];
      
      // Get all show directories
      const showDirs = await fs.readdir(this.showsDir);
      
      // For each show directory, read its episodes
      for (const showDir of showDirs) {
        const episodesFile = path.join(this.showsDir, showDir, 'episodes.json');
        
        if (await fs.pathExists(episodesFile)) {
          const showEpisodes = await fs.readJson(episodesFile);
          episodes.push(...showEpisodes.map(ep => new Episode(ep)));
        }
      }
      
      return episodes;
    } catch (error) {
      console.error(chalk.red(`Error getting all episodes: ${error.message}`));
      return [];
    }
  }

  /**
   * Find episode by NHK ID
   * @param {string} nhkId Episode NHK ID
   * @returns {Promise<Episode|null>}
   */
  async findByNhkId(nhkId) {
    try {
      // Try to find in all shows
      const episodes = await this.getAll();
      const episode = episodes.find(ep => ep.nhkId === nhkId);
      return episode ? new Episode(episode) : null;
    } catch (error) {
      console.error(chalk.red(`Error finding episode by NHK ID: ${error.message}`));
      return null;
    }
  }

  /**
   * Get episodes by show name
   * @param {string} showName Show name
   * @returns {Promise<Array<Episode>>}
   */
  async getByShow(showName) {
    try {
      const showDir = path.join(this.showsDir, showName.toLowerCase());
      const episodesFile = path.join(showDir, 'episodes.json');
      
      if (await fs.pathExists(episodesFile)) {
        const episodes = await fs.readJson(episodesFile);
        return episodes.map(ep => new Episode(ep));
      }
      
      return [];
    } catch (error) {
      console.error(chalk.red(`Error getting episodes for show ${showName}: ${error.message}`));
      return [];
    }
  }
  
  /**
   * Find episode by Sonarr ID
   * @param {number} sonarrEpisodeId Sonarr episode ID
   * @returns {Promise<Episode|null>}
   */
  async findBySonarrId(sonarrEpisodeId) {
    try {
      const episodes = await this.getAll();
      const episode = episodes.find(
        ep => ep.sonarr && ep.sonarr.id === sonarrEpisodeId
      );
      return episode ? new Episode(episode) : null;
    } catch (error) {
      console.error(chalk.red(`Error finding episode by Sonarr ID: ${error.message}`));
      return null;
    }
  }
  
  /**
   * Get downloaded episodes
   * @returns {Promise<Array<Episode>>}
   */
  async getDownloaded() {
    try {
      const episodes = await this.getAll();
      return episodes
        .filter(ep => ep.downloadStatus && ep.downloadStatus.downloaded)
        .map(ep => new Episode(ep));
    } catch (error) {
      console.error(chalk.red(`Error getting downloaded episodes: ${error.message}`));
      return [];
    }
  }
  
  /**
   * Get episodes with download errors
   * @returns {Promise<Array<Episode>>}
   */
  async getWithErrors() {
    try {
      const episodes = await this.getAll();
      return episodes
        .filter(ep => 
          ep.downloadStatus && 
          !ep.downloadStatus.downloaded && 
          ep.downloadStatus.error
        )
        .map(ep => new Episode(ep));
    } catch (error) {
      console.error(chalk.red(`Error getting episodes with errors: ${error.message}`));
      return [];
    }
  }
  
  /**
   * Create a new episode
   * @param {Episode} episode Episode to create
   * @returns {Promise<Episode>}
   */
  async create(episode) {
    try {
      // Validate the episode
      episode.validate();
      
      // Check if exists already
      const existingEpisode = await this.findByNhkId(episode.nhkId);
      if (existingEpisode) {
        throw new Error(`Episode with NHK ID ${episode.nhkId} already exists`);
      }
      
      // Get show episodes
      const showEpisodes = await this.getByShow(episode.show);
      
      // Add new episode
      showEpisodes.push(episode);
      
      // Save episodes back to file
      const showDir = path.join(this.showsDir, episode.show.toLowerCase());
      await fs.ensureDir(showDir);
      
      const episodesFile = path.join(showDir, 'episodes.json');
      await fs.writeJson(episodesFile, showEpisodes.map(ep => ep.toJSON()), { spaces: 2 });
      
      console.log(chalk.green(`Created episode "${episode.title}" for show "${episode.show}"`));
      
      return episode;
    } catch (error) {
      console.error(chalk.red(`Error creating episode: ${error.message}`));
      throw error;
    }
  }
  
  /**
   * Update an episode
   * @param {string} nhkId Episode NHK ID
   * @param {Object} episodeData Updated episode data
   * @returns {Promise<Episode>}
   */
  async update(nhkId, episodeData) {
    try {
      // Find the episode
      const existingEpisode = await this.findByNhkId(nhkId);
      if (!existingEpisode) {
        throw new Error(`Episode with NHK ID ${nhkId} not found`);
      }
      
      // Get show episodes
      const showEpisodes = await this.getByShow(existingEpisode.show);
      
      // Find the episode index
      const index = showEpisodes.findIndex(ep => ep.nhkId === nhkId);
      if (index === -1) {
        throw new Error(`Episode with NHK ID ${nhkId} not found in show ${existingEpisode.show}`);
      }
      
      // Update the episode
      const updatedEpisode = new Episode({
        ...showEpisodes[index],
        ...episodeData,
        nhkId, // Keep the original NHK ID
        show: existingEpisode.show // Keep the original show
      });
      
      // Validate the updated episode
      updatedEpisode.validate();
      
      // Replace the episode
      showEpisodes[index] = updatedEpisode;
      
      // Save episodes back to file
      const showDir = path.join(this.showsDir, existingEpisode.show.toLowerCase());
      const episodesFile = path.join(showDir, 'episodes.json');
      await fs.writeJson(episodesFile, showEpisodes.map(ep => ep.toJSON()), { spaces: 2 });
      
      console.log(chalk.yellow(`Updated episode "${updatedEpisode.title}"`));
      
      return updatedEpisode;
    } catch (error) {
      console.error(chalk.red(`Error updating episode: ${error.message}`));
      throw error;
    }
  }
  
  /**
   * Delete an episode
   * @param {string} nhkId Episode NHK ID
   * @returns {Promise<boolean>}
   */
  async delete(nhkId) {
    try {
      // Find the episode
      const existingEpisode = await this.findByNhkId(nhkId);
      if (!existingEpisode) {
        return false;
      }
      
      // Get show episodes
      const showEpisodes = await this.getByShow(existingEpisode.show);
      
      // Filter out the episode
      const filteredEpisodes = showEpisodes.filter(ep => ep.nhkId !== nhkId);
      
      // Save episodes back to file
      const showDir = path.join(this.showsDir, existingEpisode.show.toLowerCase());
      const episodesFile = path.join(showDir, 'episodes.json');
      await fs.writeJson(episodesFile, filteredEpisodes.map(ep => ep.toJSON()), { spaces: 2 });
      
      console.log(chalk.yellow(`Deleted episode "${existingEpisode.title}"`));
      
      return true;
    } catch (error) {
      console.error(chalk.red(`Error deleting episode: ${error.message}`));
      return false;
    }
  }
  
  /**
   * Update episode download status
   * @param {string} nhkId Episode NHK ID
   * @param {Object} downloadStatus Download status object
   * @returns {Promise<Episode>} Updated episode
   */
  async updateDownloadStatus(nhkId, downloadStatus) {
    try {
      // Find the episode
      const existingEpisode = await this.findByNhkId(nhkId);
      if (!existingEpisode) {
        throw new Error(`Episode with NHK ID ${nhkId} not found`);
      }
      
      // Update download status
      existingEpisode.downloadStatus = {
        ...existingEpisode.downloadStatus,
        ...downloadStatus
      };
      
      // Update the episode
      return await this.update(nhkId, existingEpisode);
    } catch (error) {
      console.error(chalk.red(`Error updating episode download status: ${error.message}`));
      throw error;
    }
  }
  
  /**
   * Update episode Sonarr metadata
   * @param {string} nhkId Episode NHK ID
   * @param {Object} sonarrData Sonarr metadata
   * @returns {Promise<Episode>} Updated episode
   */
  async updateSonarrData(nhkId, sonarrData) {
    try {
      // Find the episode
      const existingEpisode = await this.findByNhkId(nhkId);
      if (!existingEpisode) {
        throw new Error(`Episode with NHK ID ${nhkId} not found`);
      }
      
      // Update Sonarr data
      existingEpisode.sonarr = {
        ...existingEpisode.sonarr,
        ...sonarrData
      };
      
      // Update the episode
      return await this.update(nhkId, existingEpisode);
    } catch (error) {
      console.error(chalk.red(`Error updating episode Sonarr data: ${error.message}`));
      throw error;
    }
  }
}

module.exports = FileEpisodeRepository;