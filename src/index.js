#!/usr/bin/env node
// filepath: /home/hflin/nhktool/src/index.js
const path = require('path');
const chalk = require('chalk');
const ApplicationService = require('./application/services/ApplicationService');
const logger = require('./utils/logger');

// Define configuration
const config = {
  configDir: path.join(process.cwd(), 'config'),
  dataDir: path.join(process.cwd(), 'data'),
  downloadDir: path.join(process.cwd(), 'downloads'),
  binDir: path.join(process.cwd(), 'bin')
};

// Create application instance
const app = new ApplicationService(config);

/**
 * Main application entry point
 */
async function main() {
  try {
    console.log(chalk.blue('Starting NHK Tool...'));
    
    // Initialize application
    await app.initialize();
    
    // Set up auto-check schedule if enabled
    const configManager = app.getConfigManager();
    const autoCheckConfig = await configManager.getConfig('auto-check', {
      enabled: false,
      interval: 12, // hours
      lastCheck: null
    });
    
    if (autoCheckConfig.enabled) {
      console.log(chalk.blue(`Auto-check enabled, interval: ${autoCheckConfig.interval} hours`));
      
      // Schedule auto-check
      scheduleAutoCheck(autoCheckConfig.interval);
      
      // Run initial check if needed
      if (!autoCheckConfig.lastCheck || isCheckDue(autoCheckConfig.lastCheck, autoCheckConfig.interval)) {
        console.log(chalk.blue('Running initial auto-check...'));
        await runAutoCheck();
      }
    }
    
    console.log(chalk.green('NHK Tool is ready'));
    
    // Keep process alive
    process.stdin.resume();
    
  } catch (error) {
    console.error(chalk.red(`Error starting application: ${error.message}`));
    console.error(error.stack);
    logger.error('Application error', error);
    
    process.exit(1);
  }
}

/**
 * Schedule automatic checking of shows
 * @param {number} intervalHours Hours between checks
 */
function scheduleAutoCheck(intervalHours) {
  const intervalMs = intervalHours * 60 * 60 * 1000;
  
  setInterval(async () => {
    console.log(chalk.blue('Running scheduled auto-check...'));
    await runAutoCheck();
  }, intervalMs);
  
  console.log(chalk.blue(`Auto-check scheduled to run every ${intervalHours} hours`));
}

/**
 * Check if it's time to run auto-check again
 * @param {string} lastCheckIso ISO timestamp of last check
 * @param {number} intervalHours Hours between checks
 * @returns {boolean} True if check is due
 */
function isCheckDue(lastCheckIso, intervalHours) {
  const lastCheck = new Date(lastCheckIso);
  const now = new Date();
  const timeSinceLastCheck = now - lastCheck;
  const intervalMs = intervalHours * 60 * 60 * 1000;
  
  return timeSinceLastCheck >= intervalMs;
}

/**
 * Run auto-check to fetch new episodes for all enabled shows
 */
async function runAutoCheck() {
  try {
    console.log(chalk.blue('Starting auto-check for new episodes...'));
    
    // Get all enabled shows
    const showService = app.getShowService();
    const shows = await showService.getEnabledShows();
    
    console.log(chalk.blue(`Found ${shows.length} enabled shows to check`));
    
    if (shows.length === 0) {
      console.log(chalk.yellow('No shows enabled for auto-check'));
      return;
    }
    
    // Check for new episodes
    let totalNewEpisodes = 0;
    const showsWithNewEpisodes = [];
    
    for (const show of shows) {
      console.log(chalk.blue(`Checking for new episodes of ${show.name}...`));
      
      try {
        const episodes = await showService.fetchNhkEpisodes(show.nhkId);
        const newEpisodeCount = episodes.length - show.state.episodeCount;
        
        if (newEpisodeCount > 0) {
          console.log(chalk.green(`Found ${newEpisodeCount} new episodes for ${show.name}`));
          totalNewEpisodes += newEpisodeCount;
          showsWithNewEpisodes.push({
            show: show.name,
            nhkId: show.nhkId,
            newEpisodes: newEpisodeCount
          });
        } else {
          console.log(chalk.blue(`No new episodes found for ${show.name}`));
        }
      } catch (error) {
        console.error(chalk.red(`Error checking for episodes of ${show.name}: ${error.message}`));
        logger.error(`Auto-check error for show ${show.name}`, error);
      }
    }
    
    console.log(chalk.green(`Auto-check completed. Found ${totalNewEpisodes} new episodes across ${showsWithNewEpisodes.length} shows.`));
    
    // Update last check time
    const configManager = app.getConfigManager();
    const autoCheckConfig = await configManager.getConfig('auto-check');
    autoCheckConfig.lastCheck = new Date().toISOString();
    await configManager.saveConfig('auto-check', autoCheckConfig);
    
    // Sync with Sonarr if enabled
    if (app.hasSonarrIntegration() && showsWithNewEpisodes.length > 0) {
      await syncNewEpisodesWithSonarr(showsWithNewEpisodes);
    }
    
    // Auto-download if enabled
    const downloadConfig = await configManager.getConfig('auto-download', {
      enabled: false,
      newestOnly: true
    });
    
    if (downloadConfig.enabled && showsWithNewEpisodes.length > 0) {
      await downloadNewEpisodes(showsWithNewEpisodes, downloadConfig.newestOnly);
    }
    
  } catch (error) {
    console.error(chalk.red(`Error in auto-check: ${error.message}`));
    logger.error('Auto-check error', error);
  }
}

/**
 * Sync new episodes with Sonarr 
 * @param {Array} showsWithNewEpisodes List of shows with new episodes
 */
async function syncNewEpisodesWithSonarr(showsWithNewEpisodes) {
  console.log(chalk.blue(`Syncing ${showsWithNewEpisodes.length} shows with new episodes with Sonarr...`));
  
  const showService = app.getShowService();
  
  for (const showData of showsWithNewEpisodes) {
    // Get show
    const show = await showService.getShowByNhkId(showData.nhkId);
    
    if (show && show.sonarrId) {
      console.log(chalk.blue(`Syncing ${show.name} with Sonarr...`));
      
      try {
        const syncResult = await showService.syncEpisodesWithSonarr(show.nhkId);
        
        if (syncResult.synced) {
          console.log(chalk.green(`Synced ${syncResult.matchedCount}/${syncResult.totalEpisodes} episodes of ${show.name} with Sonarr`));
        } else {
          console.log(chalk.yellow(`Failed to sync ${show.name} with Sonarr`));
        }
      } catch (error) {
        console.error(chalk.red(`Error syncing ${show.name} with Sonarr: ${error.message}`));
        logger.error(`Sonarr sync error for ${show.name}`, error);
      }
    }
  }
}

/**
 * Download new episodes
 * @param {Array} showsWithNewEpisodes List of shows with new episodes
 * @param {boolean} newestOnly Whether to download only the newest episode per show
 */
async function downloadNewEpisodes(showsWithNewEpisodes, newestOnly) {
  console.log(chalk.blue(`Auto-downloading new episodes for ${showsWithNewEpisodes.length} shows...`));
  
  const showService = app.getShowService();
  const downloadService = app.getDownloadService();
  
  for (const showData of showsWithNewEpisodes) {
    console.log(chalk.blue(`Processing auto-download for ${showData.show}...`));
    
    try {
      // Get episodes
      const episodes = await showService.getEpisodes(showData.nhkId);
      
      // Filter for undownloaded episodes
      const undownloaded = episodes.filter(
        ep => !ep.downloadStatus || !ep.downloadStatus.downloaded
      );
      
      if (undownloaded.length === 0) {
        console.log(chalk.yellow(`All episodes of ${showData.show} are already downloaded`));
        continue;
      }
      
      // Sort by publish date (newest first)
      undownloaded.sort((a, b) => {
        const dateA = a.publishDate ? new Date(a.publishDate) : new Date(0);
        const dateB = b.publishDate ? new Date(b.publishDate) : new Date(0);
        return dateB - dateA;
      });
      
      // Select episodes to download
      const toDownload = newestOnly ? [undownloaded[0]] : undownloaded;
      
      // Queue downloads
      console.log(chalk.blue(`Auto-queueing ${toDownload.length} episodes of ${showData.show} for download`));
      
      const queueResult = await downloadService.queueEpisodes(
        toDownload.map(ep => ep.nhkId)
      );
      
      console.log(chalk.green(`Queued ${queueResult.queued} episodes of ${showData.show} for download`));
    } catch (error) {
      console.error(chalk.red(`Error queueing downloads for ${showData.show}: ${error.message}`));
      logger.error(`Auto-download error for ${showData.show}`, error);
    }
  }
}

// Start the application
if (require.main === module) {
  main().catch(error => {
    console.error(chalk.red(`Fatal error: ${error.message}`));
    console.error(error.stack);
    logger.error('Fatal error', error);
    process.exit(1);
  });
}

module.exports = { app };