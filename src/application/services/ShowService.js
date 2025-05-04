const chalk = require('chalk');
const logger = require('../../utils/logger');

/**
 * Service for managing shows and episodes
 */
class ShowService {
  /**
   * Constructor
   * @param {Object} options Configuration options
   * @param {Object} options.episodeRepository Episode repository
   * @param {Object} options.showRepository Show repository
   * @param {Object} options.nhkApiClient NHK API client
   * @param {Object} options.sonarrApiClient Sonarr API client
   * @param {Object} options.configManager Config manager 
   */
  constructor(options = {}) {
    this.episodeRepository = options.episodeRepository;
    this.showRepository = options.showRepository;
    this.nhkApiClient = options.nhkApiClient;
    this.sonarrApiClient = options.sonarrApiClient;
    this.configManager = options.configManager;
  }

  /**
   * Initialize the show service
   * @returns {Promise<void>}
   */
  async initialize() {
    console.log(chalk.blue('Initializing ShowService'));

    try {
      // Load show config
      const config = await this.configManager.getConfig('shows', {
        refreshInterval: 24 * 60 * 60 * 1000, // Default: 24 hours
        automaticRefresh: true,
        useSonarr: false,
        sonarrApiKey: '',
        sonarrUrl: 'http://localhost:8989/api'
      });
      
      this.config = config;
      
      // Check if shows need to be refreshed
      await this.checkAndRefreshShows();
      
      console.log(chalk.green('ShowService initialized'));
    } catch (error) {
      console.error(chalk.red(`Error initializing ShowService: ${error.message}`));
      throw error;
    }
  }

  /**
   * Check if shows need to be refreshed from NHK and Sonarr
   * @returns {Promise<boolean>} True if shows were refreshed
   */
  async checkAndRefreshShows() {
    // Get last refresh time
    const state = await this.configManager.getConfig('show-state', {
      lastRefresh: 0,
      totalShows: 0,
      totalEpisodes: 0
    });
    
    const now = Date.now();
    const timeSinceRefresh = now - state.lastRefresh;
    
    // Check if refresh is needed
    if (this.config.automaticRefresh && timeSinceRefresh >= this.config.refreshInterval) {
      console.log(chalk.blue('Shows need to be refreshed'));
      return this.refreshShows();
    }
    
    return false;
  }

  /**
   * Refresh shows from NHK
   * @returns {Promise<boolean>} True if successful
   */
  async refreshShows() {
    console.log(chalk.blue('Refreshing shows from NHK'));
    
    try {
      // Fetch shows from NHK
      const nhkShows = await this.nhkApiClient.getShows();
      
      if (!nhkShows || nhkShows.length === 0) {
        console.log(chalk.yellow('No shows returned from NHK API'));
        return false;
      }
      
      console.log(chalk.blue(`Fetched ${nhkShows.length} shows from NHK`));
      
      let enrichedShows = nhkShows;
      
      // If Sonarr integration is enabled, enrich with Sonarr data
      if (this.config.useSonarr && this.sonarrApiClient) {
        console.log(chalk.blue('Enriching shows with Sonarr data'));
        enrichedShows = await this.enrichShowsWithSonarr(nhkShows);
      }
      
      // Process and save each show
      let savedShows = 0;
      let totalEpisodes = 0;
      
      for (const showData of enrichedShows) {
        try {
          // Check if show already exists
          const existingShow = await this.showRepository.findByNhkId(showData.id);
          
          if (existingShow) {
            // Update existing show
            existingShow.name = showData.name;
            existingShow.description = showData.description;
            existingShow.imageUrl = showData.imageUrl;
            
            // Preserve state data
            if (!existingShow.state) {
              existingShow.state = {
                lastFetchedAt: new Date().toISOString(),
                episodeCount: 0,
                downloads: {
                  total: 0,
                  successful: 0,
                  failed: 0
                }
              };
            }
            
            existingShow.state.lastFetchedAt = new Date().toISOString();
            
            // Add Sonarr data if available
            if (showData.sonarrId) {
              existingShow.sonarrId = showData.sonarrId;
            }
            
            await this.showRepository.save(existingShow);
            
            // Fetch episodes for this show
            const episodes = await this.nhkApiClient.getEpisodes(existingShow.nhkId);
            
            if (episodes && episodes.length > 0) {
              console.log(chalk.blue(`Found ${episodes.length} episodes for show ${existingShow.name}`));
              
              // Process and save each episode
              for (const episodeData of episodes) {
                await this.processEpisode(episodeData, existingShow);
              }
              
              existingShow.state.episodeCount = episodes.length;
              await this.showRepository.saveState(existingShow.nhkId, existingShow.state);
              
              totalEpisodes += episodes.length;
            }
          } else {
            // Create new show
            const newShow = {
              nhkId: showData.id,
              name: showData.name,
              description: showData.description,
              imageUrl: showData.imageUrl,
              createdAt: new Date().toISOString(),
              state: {
                lastFetchedAt: new Date().toISOString(),
                episodeCount: 0,
                downloads: {
                  total: 0,
                  successful: 0,
                  failed: 0
                }
              }
            };
            
            // Add Sonarr data if available
            if (showData.sonarrId) {
              newShow.sonarrId = showData.sonarrId;
            }
            
            await this.showRepository.save(newShow);
            
            // Fetch episodes for this show
            const episodes = await this.nhkApiClient.getEpisodes(newShow.nhkId);
            
            if (episodes && episodes.length > 0) {
              console.log(chalk.blue(`Found ${episodes.length} episodes for show ${newShow.name}`));
              
              // Process and save each episode
              for (const episodeData of episodes) {
                await this.processEpisode(episodeData, newShow);
              }
              
              newShow.state.episodeCount = episodes.length;
              await this.showRepository.saveState(newShow.nhkId, newShow.state);
              
              totalEpisodes += episodes.length;
            }
          }
          
          savedShows++;
        } catch (error) {
          console.error(chalk.red(`Error processing show ${showData.name}: ${error.message}`));
          logger.error(`Error processing show ${showData.name}`, error);
        }
      }
      
      // Update state
      await this.configManager.saveConfig('show-state', {
        lastRefresh: Date.now(),
        totalShows: savedShows,
        totalEpisodes: totalEpisodes
      });
      
      console.log(chalk.green(`Saved ${savedShows} shows with a total of ${totalEpisodes} episodes`));
      return true;
    } catch (error) {
      console.error(chalk.red(`Error refreshing shows: ${error.message}`));
      logger.error('Error refreshing shows', error);
      return false;
    }
  }

  /**
   * Process and save an episode
   * @param {Object} episodeData Episode data from NHK API
   * @param {Object} show Parent show
   * @returns {Promise<Object>} Saved episode
   * @private
   */
  async processEpisode(episodeData, show) {
    try {
      // Check if episode already exists
      const existingEpisode = await this.episodeRepository.findByNhkId(episodeData.id);
      
      if (existingEpisode) {
        // Update existing episode
        existingEpisode.title = episodeData.title;
        existingEpisode.description = episodeData.description;
        existingEpisode.url = episodeData.url;
        existingEpisode.imageUrl = episodeData.imageUrl;
        existingEpisode.pubDate = episodeData.pubDate;
        existingEpisode.duration = episodeData.duration;
        
        await this.episodeRepository.save(existingEpisode);
        return existingEpisode;
      } else {
        // Create new episode
        const newEpisode = {
          nhkId: episodeData.id,
          showId: show.nhkId,
          title: episodeData.title,
          description: episodeData.description,
          url: episodeData.url,
          imageUrl: episodeData.imageUrl,
          pubDate: episodeData.pubDate,
          duration: episodeData.duration,
          downloadStatus: {
            attempts: 0,
            downloaded: false,
            status: 'pending'
          },
          createdAt: new Date().toISOString()
        };
        
        await this.episodeRepository.save(newEpisode);
        return newEpisode;
      }
    } catch (error) {
      console.error(chalk.red(`Error processing episode ${episodeData.id}: ${error.message}`));
      logger.error(`Error processing episode ${episodeData.id}`, error);
      throw error;
    }
  }

  /**
   * Enrich shows with data from Sonarr API
   * @param {Array<Object>} shows Array of shows from NHK API
   * @returns {Promise<Array<Object>>} Enriched shows
   * @private
   */
  async enrichShowsWithSonarr(shows) {
    try {
      console.log(chalk.blue('Fetching shows from Sonarr'));
      
      // Fetch all shows from Sonarr
      const sonarrShows = await this.sonarrApiClient.getShows();
      
      if (!sonarrShows || sonarrShows.length === 0) {
        console.log(chalk.yellow('No shows found in Sonarr'));
        return shows;
      }
      
      console.log(chalk.blue(`Found ${sonarrShows.length} shows in Sonarr`));
      
      // Map shows from Sonarr
      const sonarrShowMap = {};
      
      for (const sonarrShow of sonarrShows) {
        // Use title as key for matching
        sonarrShowMap[this.normalizeTitle(sonarrShow.title)] = sonarrShow;
        
        // Also add alternative titles if available
        if (sonarrShow.alternativeTitles && sonarrShow.alternativeTitles.length > 0) {
          for (const altTitle of sonarrShow.alternativeTitles) {
            sonarrShowMap[this.normalizeTitle(altTitle.title)] = sonarrShow;
          }
        }
      }
      
      // Match NHK shows with Sonarr shows
      for (const show of shows) {
        const normalizedTitle = this.normalizeTitle(show.name);
        
        if (sonarrShowMap[normalizedTitle]) {
          const sonarrShow = sonarrShowMap[normalizedTitle];
          
          // Add Sonarr data
          show.sonarrId = sonarrShow.id;
          show.tvdbId = sonarrShow.tvdbId;
          show.imdbId = sonarrShow.imdbId;
          
          console.log(chalk.green(`Matched show ${show.name} with Sonarr ID ${show.sonarrId}`));
        }
      }
      
      return shows;
    } catch (error) {
      console.error(chalk.red(`Error enriching shows with Sonarr: ${error.message}`));
      logger.error('Error enriching shows with Sonarr', error);
      
      // Return original shows if enrichment fails
      return shows;
    }
  }

  /**
   * Normalize a title for matching
   * @param {string} title Title to normalize
   * @returns {string} Normalized title
   * @private
   */
  normalizeTitle(title) {
    if (!title) return '';
    
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')  // Remove non-alphanumeric chars
      .trim();
  }

  /**
   * Get all shows with episodes
   * @returns {Promise<Array<Object>>} Array of shows with episodes
   */
  async getAllShows() {
    console.log(chalk.blue('Getting all shows with episodes'));
    
    try {
      // Get all shows
      const shows = await this.showRepository.getAll();
      
      if (!shows || shows.length === 0) {
        console.log(chalk.yellow('No shows found'));
        return [];
      }
      
      console.log(chalk.blue(`Found ${shows.length} shows`));
      
      // Get all episodes
      const episodes = await this.episodeRepository.getAll();
      
      if (!episodes || episodes.length === 0) {
        console.log(chalk.yellow('No episodes found'));
        
        // Return shows without episodes
        return shows.map(show => ({
          ...show,
          episodes: []
        }));
      }
      
      console.log(chalk.blue(`Found ${episodes.length} episodes`));
      
      // Group episodes by show ID
      const episodesByShow = {};
      
      for (const episode of episodes) {
        if (!episodesByShow[episode.showId]) {
          episodesByShow[episode.showId] = [];
        }
        
        episodesByShow[episode.showId].push(episode);
      }
      
      // Add episodes to shows
      const showsWithEpisodes = shows.map(show => ({
        ...show,
        episodes: episodesByShow[show.nhkId] || []
      }));
      
      return showsWithEpisodes;
    } catch (error) {
      console.error(chalk.red(`Error getting all shows: ${error.message}`));
      logger.error('Error getting all shows', error);
      throw error;
    }
  }

  /**
   * Get a show by NHK ID with episodes
   * @param {string} nhkId Show NHK ID
   * @returns {Promise<Object>} Show with episodes
   */
  async getShowById(nhkId) {
    console.log(chalk.blue(`Getting show with ID ${nhkId}`));
    
    try {
      // Get show
      const show = await this.showRepository.findByNhkId(nhkId);
      
      if (!show) {
        console.log(chalk.yellow(`Show ${nhkId} not found`));
        return null;
      }
      
      // Get episodes for this show
      const episodes = await this.episodeRepository.findByShowId(nhkId);
      
      // Add episodes to show
      const showWithEpisodes = {
        ...show,
        episodes: episodes || []
      };
      
      return showWithEpisodes;
    } catch (error) {
      console.error(chalk.red(`Error getting show ${nhkId}: ${error.message}`));
      logger.error(`Error getting show ${nhkId}`, error);
      throw error;
    }
  }

  /**
   * Update Sonarr configuration
   * @param {Object} updates Configuration updates
   * @returns {Promise<Object>} Updated configuration
   */
  async updateSonarrConfig(updates) {
    console.log(chalk.blue('Updating Sonarr configuration'));
    
    // Apply updates to config
    Object.assign(this.config, updates);
    
    // Save updated config
    await this.configManager.saveConfig('shows', this.config);
    
    console.log(chalk.green('Sonarr configuration updated'));
    
    return this.config;
  }

  /**
   * Check missing episodes from Sonarr
   * @returns {Promise<Object>} Missing episodes result
   */
  async checkMissingEpisodes() {
    if (!this.config.useSonarr || !this.sonarrApiClient) {
      console.log(chalk.yellow('Sonarr integration not enabled'));
      return {
        success: false,
        error: 'Sonarr integration not enabled'
      };
    }
    
    console.log(chalk.blue('Checking missing episodes from Sonarr'));
    
    try {
      // Get shows with Sonarr ID
      const allShows = await this.showRepository.getAll();
      const sonarrShows = allShows.filter(show => show.sonarrId);
      
      if (sonarrShows.length === 0) {
        console.log(chalk.yellow('No shows with Sonarr ID found'));
        return {
          success: true,
          missingEpisodes: [],
          message: 'No shows with Sonarr ID found'
        };
      }
      
      console.log(chalk.blue(`Found ${sonarrShows.length} shows with Sonarr ID`));
      
      const missingEpisodes = [];
      
      // Check each show in Sonarr
      for (const show of sonarrShows) {
        console.log(chalk.blue(`Checking missing episodes for show ${show.name} (Sonarr ID: ${show.sonarrId})`));
        
        // Get missing episodes from Sonarr
        const sonarrMissing = await this.sonarrApiClient.getMissingEpisodes(show.sonarrId);
        
        if (sonarrMissing && sonarrMissing.length > 0) {
          console.log(chalk.blue(`Found ${sonarrMissing.length} missing episodes in Sonarr for show ${show.name}`));
          
          // Get NHK episodes for this show
          const nhkEpisodes = await this.episodeRepository.findByShowId(show.nhkId);
          
          if (nhkEpisodes && nhkEpisodes.length > 0) {
            for (const missingEpisode of sonarrMissing) {
              // Try to match with NHK episode
              const matchedEpisode = this.findMatchingEpisode(missingEpisode, nhkEpisodes);
              
              if (matchedEpisode) {
                console.log(chalk.green(`Found NHK match for missing episode ${missingEpisode.title}`));
                
                missingEpisodes.push({
                  sonarrEpisodeId: missingEpisode.id,
                  nhkEpisodeId: matchedEpisode.nhkId,
                  title: matchedEpisode.title,
                  showId: show.nhkId,
                  showTitle: show.name,
                  airDate: missingEpisode.airDate,
                  seasonNumber: missingEpisode.seasonNumber,
                  episodeNumber: missingEpisode.episodeNumber
                });
              }
            }
          }
        }
      }
      
      console.log(chalk.green(`Found a total of ${missingEpisodes.length} missing episodes with NHK matches`));
      
      return {
        success: true,
        missingEpisodes,
        count: missingEpisodes.length
      };
    } catch (error) {
      console.error(chalk.red(`Error checking missing episodes: ${error.message}`));
      logger.error('Error checking missing episodes', error);
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Find a matching NHK episode for a Sonarr episode
   * @param {Object} sonarrEpisode Sonarr episode
   * @param {Array<Object>} nhkEpisodes Array of NHK episodes
   * @returns {Object|null} Matching NHK episode or null
   * @private
   */
  findMatchingEpisode(sonarrEpisode, nhkEpisodes) {
    // Try exact title match
    const exactTitleMatch = nhkEpisodes.find(ep => 
      this.normalizeTitle(ep.title) === this.normalizeTitle(sonarrEpisode.title)
    );
    
    if (exactTitleMatch) {
      return exactTitleMatch;
    }
    
    // Try episode number in title match
    if (sonarrEpisode.episodeNumber) {
      const episodeNumberMatch = nhkEpisodes.find(ep => {
        const epNumberMatch = ep.title.match(/Episode (\d+)/i);
        if (epNumberMatch) {
          const epNumber = parseInt(epNumberMatch[1], 10);
          return epNumber === sonarrEpisode.episodeNumber;
        }
        return false;
      });
      
      if (episodeNumberMatch) {
        return episodeNumberMatch;
      }
    }
    
    // No match found
    return null;
  }
}

module.exports = ShowService;