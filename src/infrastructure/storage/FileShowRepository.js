// filepath: /home/hflin/nhktool/src/infrastructure/storage/FileShowRepository.js
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const ShowRepository = require('../../core/repositories/ShowRepository');
const Show = require('../../core/models/Show');

/**
 * File-based implementation of the ShowRepository
 */
class FileShowRepository extends ShowRepository {
  /**
   * Constructor
   * @param {Object} options Configuration options
   * @param {string} options.dataDir Base directory for data storage
   */
  constructor(options = {}) {
    super();
    this.dataDir = options.dataDir || path.join(process.cwd(), 'data', 'shows');
    this.showsFile = path.join(this.dataDir, 'shows.json');
  }

  /**
   * Initialize the repository
   * @returns {Promise<void>}
   */
  async initialize() {
    await fs.ensureDir(this.dataDir);
    
    // Create the shows file if it doesn't exist
    if (!await fs.pathExists(this.showsFile)) {
      await fs.writeJson(this.showsFile, [], { spaces: 2 });
    }
    
    console.log(chalk.green(`Show repository initialized at ${this.dataDir}`));
  }

  /**
   * Get all shows
   * @returns {Promise<Array<Show>>}
   */
  async getAll() {
    try {
      const data = await fs.readJson(this.showsFile);
      return data.map(showData => new Show(showData));
    } catch (error) {
      console.error(chalk.red(`Error getting all shows: ${error.message}`));
      return [];
    }
  }

  /**
   * Find a show by NHK ID
   * @param {string} nhkId Show NHK ID
   * @returns {Promise<Show|null>}
   */
  async findByNhkId(nhkId) {
    try {
      const shows = await this.getAll();
      const show = shows.find(s => s.nhkId === nhkId);
      return show || null;
    } catch (error) {
      console.error(chalk.red(`Error finding show by NHK ID: ${error.message}`));
      return null;
    }
  }

  /**
   * Find a show by name (case-insensitive)
   * @param {string} name Show name
   * @returns {Promise<Show|null>}
   */
  async findByName(name) {
    try {
      const shows = await this.getAll();
      const show = shows.find(s => s.name.toLowerCase() === name.toLowerCase());
      return show || null;
    } catch (error) {
      console.error(chalk.red(`Error finding show by name: ${error.message}`));
      return null;
    }
  }
  
  /**
   * Find a show by Sonarr ID
   * @param {number} sonarrId Sonarr show ID
   * @returns {Promise<Show|null>}
   */
  async findBySonarrId(sonarrId) {
    try {
      const shows = await this.getAll();
      const show = shows.find(s => s.sonarrId === sonarrId);
      return show || null;
    } catch (error) {
      console.error(chalk.red(`Error finding show by Sonarr ID: ${error.message}`));
      return null;
    }
  }
  
  /**
   * Get all enabled shows
   * @returns {Promise<Array<Show>>}
   */
  async getAllEnabled() {
    try {
      const shows = await this.getAll();
      return shows.filter(show => show.state && show.state.enabled);
    } catch (error) {
      console.error(chalk.red(`Error getting enabled shows: ${error.message}`));
      return [];
    }
  }
  
  /**
   * Create a new show
   * @param {Show} show Show to create
   * @returns {Promise<Show>}
   */
  async create(show) {
    try {
      // Validate the show
      show.validate();
      
      // Check for duplicate NHK ID
      const existingShow = await this.findByNhkId(show.nhkId);
      if (existingShow) {
        throw new Error(`Show with NHK ID ${show.nhkId} already exists`);
      }
      
      // Read all shows
      const shows = await this.getAll();
      
      // Add the new show
      shows.push(show);
      
      // Save all shows
      await fs.writeJson(this.showsFile, shows.map(s => s.toJSON()), { spaces: 2 });
      
      console.log(chalk.green(`Show "${show.name}" created`));
      
      // Create show directory
      const showDir = path.join(this.dataDir, show.name.toLowerCase());
      await fs.ensureDir(showDir);
      
      return show;
    } catch (error) {
      console.error(chalk.red(`Error creating show: ${error.message}`));
      throw error;
    }
  }
  
  /**
   * Update a show
   * @param {string} nhkId Show NHK ID
   * @param {Object} showData Updated show data
   * @returns {Promise<Show>}
   */
  async update(nhkId, showData) {
    try {
      // Read all shows
      const shows = await this.getAll();
      
      // Find the show index
      const index = shows.findIndex(s => s.nhkId === nhkId);
      if (index === -1) {
        throw new Error(`Show with NHK ID ${nhkId} not found`);
      }
      
      // Update the show
      const updatedShow = new Show({
        ...shows[index],
        ...showData,
        nhkId // Keep the original NHK ID
      });
      
      // Validate the updated show
      updatedShow.validate();
      
      // Replace the show
      shows[index] = updatedShow;
      
      // Save all shows
      await fs.writeJson(this.showsFile, shows.map(s => s.toJSON()), { spaces: 2 });
      
      console.log(chalk.yellow(`Show "${updatedShow.name}" updated`));
      
      return updatedShow;
    } catch (error) {
      console.error(chalk.red(`Error updating show: ${error.message}`));
      throw error;
    }
  }
  
  /**
   * Delete a show
   * @param {string} nhkId Show NHK ID
   * @returns {Promise<boolean>}
   */
  async delete(nhkId) {
    try {
      // Read all shows
      const shows = await this.getAll();
      
      // Find the show
      const show = shows.find(s => s.nhkId === nhkId);
      if (!show) {
        return false;
      }
      
      // Filter out the show
      const filteredShows = shows.filter(s => s.nhkId !== nhkId);
      
      // Save the filtered shows
      await fs.writeJson(this.showsFile, filteredShows.map(s => s.toJSON()), { spaces: 2 });
      
      console.log(chalk.yellow(`Show "${show.name}" deleted`));
      
      return true;
    } catch (error) {
      console.error(chalk.red(`Error deleting show: ${error.message}`));
      return false;
    }
  }
  
  /**
   * Save a show's state
   * @param {string} nhkId Show NHK ID
   * @param {Object} state Show state
   * @returns {Promise<boolean>}
   */
  async saveState(nhkId, state) {
    try {
      // Get the show
      const show = await this.findByNhkId(nhkId);
      if (!show) {
        throw new Error(`Show with NHK ID ${nhkId} not found`);
      }
      
      // Update the state
      show.state = {
        ...show.state,
        ...state,
        lastUpdate: new Date()
      };
      
      // Update the show
      await this.update(nhkId, show);
      
      // Save state to separate file for better performance
      const stateFile = path.join(this.dataDir, show.name.toLowerCase(), 'state.json');
      await fs.writeJson(stateFile, show.state, { spaces: 2 });
      
      return true;
    } catch (error) {
      console.error(chalk.red(`Error saving show state: ${error.message}`));
      return false;
    }
  }
  
  /**
   * Get a show's episodes
   * @param {string} nhkId Show NHK ID
   * @returns {Promise<Array>}
   */
  async getEpisodes(nhkId) {
    try {
      // Get the show
      const show = await this.findByNhkId(nhkId);
      if (!show) {
        throw new Error(`Show with NHK ID ${nhkId} not found`);
      }
      
      // Read episodes from file
      const episodesFile = path.join(this.dataDir, show.name.toLowerCase(), 'episodes.json');
      
      if (await fs.pathExists(episodesFile)) {
        return await fs.readJson(episodesFile);
      }
      
      return [];
    } catch (error) {
      console.error(chalk.red(`Error getting episodes: ${error.message}`));
      return [];
    }
  }
  
  /**
   * Save a show's episodes
   * @param {string} nhkId Show NHK ID
   * @param {Array} episodes Array of episodes
   * @returns {Promise<boolean>}
   */
  async saveEpisodes(nhkId, episodes) {
    try {
      // Get the show
      const show = await this.findByNhkId(nhkId);
      if (!show) {
        throw new Error(`Show with NHK ID ${nhkId} not found`);
      }
      
      // Create show directory if it doesn't exist
      const showDir = path.join(this.dataDir, show.name.toLowerCase());
      await fs.ensureDir(showDir);
      
      // Save episodes to file
      const episodesFile = path.join(showDir, 'episodes.json');
      await fs.writeJson(episodesFile, episodes, { spaces: 2 });
      
      // Update show state
      await this.saveState(nhkId, {
        episodeCount: episodes.length,
        lastUpdate: new Date()
      });
      
      console.log(chalk.green(`Saved ${episodes.length} episodes for show "${show.name}"`));
      
      return true;
    } catch (error) {
      console.error(chalk.red(`Error saving episodes: ${error.message}`));
      return false;
    }
  }
}

module.exports = FileShowRepository;