// filepath: /home/hflin/nhktool/src/application/services/ApplicationService.js
const path = require('path');
const chalk = require('chalk');

// Core models
const Show = require('../../core/models/Show');
const Episode = require('../../core/models/Episode');

// Infrastructure components
const NhkApiClient = require('../../infrastructure/api/NhkApiClient');
const SonarrApiClient = require('../../infrastructure/api/SonarrApiClient');
const YTDLPDownloader = require('../../infrastructure/api/YTDLPDownloader');
const FileShowRepository = require('../../infrastructure/storage/FileShowRepository');
const FileEpisodeRepository = require('../../infrastructure/storage/FileEpisodeRepository');

// Application services
const ShowService = require('./ShowService');
const DownloadService = require('./DownloadService');

// Utilities
const ConfigManager = require('../../utils/ConfigManager');

/**
 * Main application service that bootstraps and coordinates all components
 */
class ApplicationService {
  /**
   * Constructor
   * @param {Object} options Configuration options
   * @param {string} options.configDir Configuration directory
   * @param {string} options.dataDir Data directory
   * @param {string} options.downloadDir Download directory
   * @param {string} options.binDir Binary directory
   */
  constructor(options = {}) {
    this.configDir = options.configDir || path.join(process.cwd(), 'config');
    this.dataDir = options.dataDir || path.join(process.cwd(), 'data');
    this.downloadDir = options.downloadDir || path.join(process.cwd(), 'downloads');
    this.binDir = options.binDir || path.join(process.cwd(), 'bin');
    
    this.services = {};
    this.repositories = {};
    this.apiClients = {};
  }

  /**
   * Initialize the application
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      console.log(chalk.blue('Initializing NHK Tool application...'));
      
      // Create config manager
      this.configManager = new ConfigManager({
        configDir: this.configDir
      });
      
      // Initialize config manager
      await this.configManager.initialize();
      
      // Load main application config
      const appConfig = await this.configManager.getConfig('app', {
        nhk: {
          baseUrl: 'https://www3.nhk.or.jp/nhkworld',
        },
        sonarr: {
          baseUrl: process.env.SONARR_URL || 'http://localhost:8989',
          apiKey: process.env.SONARR_API_KEY || '',
          enabled: false,
        },
        ytdlp: {
          binaryPath: path.join(this.binDir, 'yt-dlp')
        },
        storage: {
          dataDir: this.dataDir,
          showsDir: path.join(this.dataDir, 'shows'),
          episodesDir: path.join(this.dataDir, 'episodes')
        },
        downloads: {
          outputDir: this.downloadDir,
          parallel: 1,
          importToSonarr: false,
          qualityProfileId: 1
        }
      });
      
      this.appConfig = appConfig;
      
      // Initialize repositories
      await this.initializeRepositories();
      
      // Initialize API clients
      await this.initializeApiClients();
      
      // Initialize services
      await this.initializeServices();
      
      console.log(chalk.green('Application initialized successfully'));
      
      return this;
    } catch (error) {
      console.error(chalk.red(`Error initializing application: ${error.message}`));
      throw error;
    }
  }

  /**
   * Initialize repositories
   * @private
   * @returns {Promise<void>}
   */
  async initializeRepositories() {
    console.log(chalk.blue('Initializing repositories...'));
    
    // Create show repository
    const showRepository = new FileShowRepository({
      dataDir: this.appConfig.storage.showsDir
    });
    
    // Create episode repository
    const episodeRepository = new FileEpisodeRepository({
      dataDir: this.appConfig.storage.episodesDir,
      showsDir: this.appConfig.storage.showsDir
    });
    
    // Initialize repositories
    await showRepository.initialize();
    await episodeRepository.initialize();
    
    // Store repositories
    this.repositories.show = showRepository;
    this.repositories.episode = episodeRepository;
    
    console.log(chalk.green('Repositories initialized'));
  }

  /**
   * Initialize API clients
   * @private
   * @returns {Promise<void>}
   */
  async initializeApiClients() {
    console.log(chalk.blue('Initializing API clients...'));
    
    // Create NHK API client
    const nhkApiClient = new NhkApiClient({
      baseUrl: this.appConfig.nhk.baseUrl
    });
    
    // Create Sonarr API client if enabled
    let sonarrApiClient = null;
    
    if (this.appConfig.sonarr.enabled && this.appConfig.sonarr.apiKey) {
      sonarrApiClient = new SonarrApiClient({
        baseUrl: this.appConfig.sonarr.baseUrl,
        apiKey: this.appConfig.sonarr.apiKey
      });
      
      // Test connection
      try {
        const connected = await sonarrApiClient.testConnection();
        
        if (!connected) {
          console.warn(chalk.yellow('Could not connect to Sonarr, integration will be disabled'));
          sonarrApiClient = null;
        }
      } catch (error) {
        console.warn(chalk.yellow(`Sonarr connection error: ${error.message}`));
        sonarrApiClient = null;
      }
    }
    
    // Create YT-DLP downloader
    const ytdlpDownloader = new YTDLPDownloader({
      binaryPath: this.appConfig.ytdlp.binaryPath,
      outputDir: this.appConfig.downloads.outputDir
    });
    
    // Store API clients
    this.apiClients.nhk = nhkApiClient;
    this.apiClients.sonarr = sonarrApiClient;
    this.apiClients.ytdlp = ytdlpDownloader;
    
    console.log(chalk.green('API clients initialized'));
  }

  /**
   * Initialize services
   * @private
   * @returns {Promise<void>}
   */
  async initializeServices() {
    console.log(chalk.blue('Initializing services...'));
    
    // Create show service
    const showService = new ShowService({
      showRepository: this.repositories.show,
      episodeRepository: this.repositories.episode,
      nhkApiClient: this.apiClients.nhk,
      sonarrApiClient: this.apiClients.sonarr,
      configManager: this.configManager
    });
    
    // Create download service
    const downloadService = new DownloadService({
      showRepository: this.repositories.show,
      episodeRepository: this.repositories.episode,
      ytdlpDownloader: this.apiClients.ytdlp,
      nhkApiClient: this.apiClients.nhk,
      sonarrApiClient: this.apiClients.sonarr,
      configManager: this.configManager
    });
    
    // Initialize download service
    await downloadService.initialize();
    
    // Store services
    this.services.show = showService;
    this.services.download = downloadService;
    
    console.log(chalk.green('Services initialized'));
  }

  /**
   * Get show service
   * @returns {ShowService}
   */
  getShowService() {
    return this.services.show;
  }

  /**
   * Get download service
   * @returns {DownloadService}
   */
  getDownloadService() {
    return this.services.download;
  }

  /**
   * Get configuration manager
   * @returns {ConfigManager}
   */
  getConfigManager() {
    return this.configManager;
  }

  /**
   * Check if Sonarr integration is available
   * @returns {boolean}
   */
  hasSonarrIntegration() {
    return this.apiClients.sonarr !== null;
  }
}

module.exports = ApplicationService;