const chalk = require('chalk');
const path = require('path');
const fs = require('fs-extra');
const logger = require('../../utils/logger');

/**
 * Service for managing downloads
 */
class DownloadService {
  /**
   * Constructor
   * @param {Object} options Configuration options
   * @param {Object} options.episodeRepository Episode repository
   * @param {Object} options.showRepository Show repository
   * @param {Object} options.downloader YT-DLP wrapper
   * @param {Object} options.configManager Config manager
   * @param {string} options.downloadDir Directory for downloaded videos
   */
  constructor(options = {}) {
    this.episodeRepository = options.episodeRepository;
    this.showRepository = options.showRepository;
    this.downloader = options.downloader;
    this.configManager = options.configManager;
    this.downloadDir = options.downloadDir || path.join(process.cwd(), 'downloads');
    this.downloadQueue = [];
    this.isProcessing = false;
  }

  /**
   * Initialize the download service
   * @returns {Promise<void>}
   */
  async initialize() {
    console.log(chalk.blue(`Initializing DownloadService with download dir: ${this.downloadDir}`));
    
    try {
      // Ensure download directory exists
      await fs.ensureDir(this.downloadDir);
      
      // Load download config
      const config = await this.configManager.getConfig('download', {
        concurrentDownloads: 1,
        retryCount: 3,
        fileFormat: '%(title)s-%(id)s.%(ext)s',
        resolution: '1080'
      });
      
      this.config = config;
      
      // Load any pending downloads
      const pendingDownloads = await this.configManager.getConfig('pending-downloads', {
        queue: []
      });
      
      if (pendingDownloads.queue && pendingDownloads.queue.length > 0) {
        console.log(chalk.blue(`Loading ${pendingDownloads.queue.length} pending downloads`));
        this.downloadQueue = pendingDownloads.queue;
      }
      
      console.log(chalk.green('DownloadService initialized'));
    } catch (error) {
      console.error(chalk.red(`Error initializing DownloadService: ${error.message}`));
      throw error;
    }
  }

  /**
   * Queue episodes for download
   * @param {Array<string>} episodeIds Array of episode NHK IDs to queue
   * @returns {Promise<Object>} Queue result
   */
  async queueEpisodes(episodeIds) {
    console.log(chalk.blue(`Queueing ${episodeIds.length} episodes for download`));
    
    const queuedEpisodes = [];
    const alreadyQueuedEpisodes = [];
    const notFoundEpisodes = [];
    
    for (const episodeId of episodeIds) {
      // Check if episode exists
      const episode = await this.episodeRepository.findByNhkId(episodeId);
      
      if (!episode) {
        console.log(chalk.yellow(`Episode ${episodeId} not found`));
        notFoundEpisodes.push(episodeId);
        continue;
      }
      
      // Check if already in queue
      const isAlreadyQueued = this.downloadQueue.some(item => item.episodeId === episodeId);
      
      if (isAlreadyQueued) {
        console.log(chalk.yellow(`Episode ${episodeId} already in queue`));
        alreadyQueuedEpisodes.push(episodeId);
        continue;
      }
      
      // Check if already downloaded
      if (episode.downloadStatus && episode.downloadStatus.downloaded) {
        console.log(chalk.yellow(`Episode ${episodeId} already downloaded`));
        alreadyQueuedEpisodes.push(episodeId);
        continue;
      }
      
      // Add to queue
      this.downloadQueue.push({
        episodeId,
        url: episode.url,
        title: episode.title,
        showId: episode.showId,
        addedAt: new Date().toISOString(),
        priority: 1,
        attempts: 0
      });
      
      queuedEpisodes.push(episodeId);
      
      console.log(chalk.green(`Episode ${episodeId} (${episode.title}) queued for download`));
    }
    
    // Save queue to config
    await this.savePendingDownloads();
    
    // Start processing if not already running
    if (!this.isProcessing) {
      this.processDownloadQueue();
    }
    
    return {
      queued: queuedEpisodes.length,
      alreadyQueued: alreadyQueuedEpisodes.length,
      notFound: notFoundEpisodes.length
    };
  }

  /**
   * Start processing the download queue
   */
  async processDownloadQueue() {
    if (this.isProcessing || this.downloadQueue.length === 0) {
      return;
    }
    
    this.isProcessing = true;
    console.log(chalk.blue(`Starting download queue processing (${this.downloadQueue.length} items)`));
    
    try {
      // Sort queue by priority and time added
      this.downloadQueue.sort((a, b) => {
        if (a.priority !== b.priority) {
          return b.priority - a.priority; // Higher priority first
        }
        return new Date(a.addedAt) - new Date(b.addedAt); // Older first
      });
      
      // Get top items to process based on concurrency
      const itemsToProcess = this.downloadQueue.slice(0, this.config.concurrentDownloads);
      
      // Process each item
      for (const item of itemsToProcess) {
        try {
          console.log(chalk.blue(`Processing download for episode ${item.episodeId}`));
          
          // Get episode
          const episode = await this.episodeRepository.findByNhkId(item.episodeId);
          
          if (!episode) {
            console.log(chalk.yellow(`Episode ${item.episodeId} not found, removing from queue`));
            this.removeFromQueue(item.episodeId);
            continue;
          }
          
          // Get show
          const show = await this.showRepository.findByNhkId(item.showId);
          
          // Create show download directory
          const showDir = show ? 
            path.join(this.downloadDir, this.sanitizeFileName(show.name)) : 
            path.join(this.downloadDir, 'other');
          
          await fs.ensureDir(showDir);
          
          // Update download status
          if (!episode.downloadStatus) {
            episode.downloadStatus = { attempts: 0 };
          }
          
          episode.downloadStatus.attempts += 1;
          episode.downloadStatus.lastAttempt = new Date().toISOString();
          episode.downloadStatus.status = 'downloading';
          
          await this.episodeRepository.save(episode);
          
          // Construct filename
          const sanitizedTitle = this.sanitizeFileName(episode.title);
          const filename = `${sanitizedTitle}-${episode.nhkId}`;
          
          // Download video
          console.log(chalk.blue(`Downloading episode ${episode.title} to ${showDir}`));
          
          const downloadResult = await this.downloader.download({
            url: episode.url,
            outputDir: showDir,
            outputTemplate: filename,
            resolution: this.config.resolution
          });
          
          // Update episode with download result
          if (downloadResult.success) {
            console.log(chalk.green(`Download successful for ${episode.title}`));
            
            episode.downloadStatus.downloaded = true;
            episode.downloadStatus.status = 'completed';
            episode.downloadStatus.completedAt = new Date().toISOString();
            episode.downloadStatus.filePath = downloadResult.filePath;
            episode.downloadStatus.fileSize = downloadResult.fileSize;
            
            // Update show download count
            if (show && show.state && show.state.downloads) {
              show.state.downloads.total += 1;
              show.state.downloads.successful += 1;
              
              await this.showRepository.saveState(show.nhkId, show.state);
            }
          } else {
            console.log(chalk.red(`Download failed for ${episode.title}: ${downloadResult.error}`));
            
            episode.downloadStatus.status = 'failed';
            episode.downloadStatus.error = downloadResult.error;
            
            // If max retry count reached, mark as permanently failed
            if (episode.downloadStatus.attempts >= this.config.retryCount) {
              episode.downloadStatus.permanentlyFailed = true;
              
              if (show && show.state && show.state.downloads) {
                show.state.downloads.failed += 1;
                await this.showRepository.saveState(show.nhkId, show.state);
              }
            } else {
              // Otherwise requeue with lower priority
              item.priority -= 1;
              item.attempts += 1;
              continue; // Don't remove from queue
            }
          }
          
          await this.episodeRepository.save(episode);
          
          // Remove from queue
          this.removeFromQueue(item.episodeId);
        } catch (error) {
          console.error(chalk.red(`Error processing download for episode ${item.episodeId}: ${error.message}`));
          logger.error(`Download error for episode ${item.episodeId}`, error);
          
          // Increment attempt count
          item.attempts += 1;
          
          // If max retry count reached, remove from queue
          if (item.attempts >= this.config.retryCount) {
            this.removeFromQueue(item.episodeId);
            
            // Update episode status
            try {
              const episode = await this.episodeRepository.findByNhkId(item.episodeId);
              if (episode) {
                if (!episode.downloadStatus) {
                  episode.downloadStatus = { attempts: item.attempts };
                }
                
                episode.downloadStatus.status = 'failed';
                episode.downloadStatus.permanentlyFailed = true;
                episode.downloadStatus.error = error.message;
                
                await this.episodeRepository.save(episode);
              }
            } catch (err) {
              console.error(chalk.red(`Error updating episode status: ${err.message}`));
            }
          } else {
            // Lower priority for next attempt
            item.priority -= 1;
          }
        }
      }
      
      // Save queue state
      await this.savePendingDownloads();
      
      // If more items in queue, continue processing
      if (this.downloadQueue.length > 0) {
        console.log(chalk.blue(`${this.downloadQueue.length} items remaining in download queue`));
        
        // Schedule next batch
        setTimeout(() => this.processDownloadQueue(), 1000);
      } else {
        console.log(chalk.green('Download queue processing completed'));
        this.isProcessing = false;
      }
    } catch (error) {
      console.error(chalk.red(`Error processing download queue: ${error.message}`));
      logger.error('Download queue error', error);
      
      this.isProcessing = false;
    }
  }

  /**
   * Remove an episode from the download queue
   * @param {string} episodeId Episode NHK ID
   * @private
   */
  removeFromQueue(episodeId) {
    const initialLength = this.downloadQueue.length;
    this.downloadQueue = this.downloadQueue.filter(item => item.episodeId !== episodeId);
    
    if (this.downloadQueue.length < initialLength) {
      console.log(chalk.blue(`Removed episode ${episodeId} from download queue`));
    }
  }

  /**
   * Save pending downloads to configuration
   * @private
   */
  async savePendingDownloads() {
    await this.configManager.saveConfig('pending-downloads', {
      queue: this.downloadQueue,
      lastUpdated: new Date().toISOString()
    });
  }

  /**
   * Sanitize a filename to be safe for filesystem
   * @param {string} name Filename to sanitize
   * @returns {string} Sanitized filename
   * @private
   */
  sanitizeFileName(name) {
    if (!name) return 'unknown';
    
    return name
      .replace(/[<>:"\/\\|?*]+/g, '_') // Replace invalid chars with underscore
      .replace(/\s+/g, ' ')           // Normalize whitespace
      .trim();
  }

  /**
   * Cancel downloads for specific episodes
   * @param {Array<string>} episodeIds Episode NHK IDs to cancel
   * @returns {Promise<Object>} Cancel result
   */
  async cancelDownloads(episodeIds) {
    console.log(chalk.blue(`Cancelling downloads for ${episodeIds.length} episodes`));
    
    let cancelledCount = 0;
    
    for (const episodeId of episodeIds) {
      // Remove from queue
      const initialLength = this.downloadQueue.length;
      this.downloadQueue = this.downloadQueue.filter(item => item.episodeId !== episodeId);
      
      if (this.downloadQueue.length < initialLength) {
        console.log(chalk.green(`Cancelled download for episode ${episodeId}`));
        cancelledCount++;
      }
    }
    
    // Save queue state
    await this.savePendingDownloads();
    
    return {
      cancelled: cancelledCount,
      remaining: this.downloadQueue.length
    };
  }

  /**
   * Get download queue status
   * @returns {Promise<Object>} Queue status
   */
  async getQueueStatus() {
    return {
      queueLength: this.downloadQueue.length,
      isProcessing: this.isProcessing,
      nextItems: this.downloadQueue.slice(0, 5),
      config: this.config
    };
  }

  /**
   * Update download configuration
   * @param {Object} updates Configuration updates
   * @returns {Promise<Object>} Updated configuration
   */
  async updateConfig(updates) {
    console.log(chalk.blue('Updating download configuration'));
    
    // Apply updates to config
    Object.assign(this.config, updates);
    
    // Save updated config
    await this.configManager.saveConfig('download', this.config);
    
    console.log(chalk.green('Download configuration updated'));
    
    return this.config;
  }

  /**
   * Retry failed downloads
   * @returns {Promise<Object>} Retry result
   */
  async retryFailedDownloads() {
    console.log(chalk.blue('Retrying failed downloads'));
    
    // Get all episodes with failed downloads
    const episodes = await this.episodeRepository.getAll();
    const failedEpisodes = episodes.filter(ep => 
      ep.downloadStatus && 
      ep.downloadStatus.status === 'failed' && 
      !ep.downloadStatus.downloaded &&
      !ep.downloadStatus.permanentlyFailed
    );
    
    if (failedEpisodes.length === 0) {
      console.log(chalk.yellow('No failed downloads to retry'));
      
      return {
        retried: 0
      };
    }
    
    console.log(chalk.blue(`Found ${failedEpisodes.length} failed downloads to retry`));
    
    // Queue failed episodes
    const episodeIds = failedEpisodes.map(ep => ep.nhkId);
    const queueResult = await this.queueEpisodes(episodeIds);
    
    return {
      retried: queueResult.queued,
      alreadyQueued: queueResult.alreadyQueued,
      notFound: queueResult.notFound
    };
  }
}

module.exports = DownloadService;