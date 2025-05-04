#!/usr/bin/env node
// filepath: /home/hflin/nhktool/src/interfaces/cli/cli.js
const { Command } = require('commander');
const chalk = require('chalk');
const path = require('path');
const Table = require('cli-table3');
const inquirer = require('inquirer');
const ora = require('ora');
const prettyBytes = require('pretty-bytes');
const ApplicationService = require('../../application/services/ApplicationService');

// Create application instance
const app = new ApplicationService();
const program = new Command();

// Configure program
program
  .name('nhktool')
  .description('NHK World TV show downloader and metadata manager')
  .version('1.0.0');

// Show commands
program
  .command('shows')
  .description('List all configured shows')
  .option('-e, --enabled-only', 'Show only enabled shows')
  .action(async (options) => {
    const spinner = ora('Initializing application...').start();
    
    try {
      await app.initialize();
      spinner.succeed('Application initialized');
      
      const showService = app.getShowService();
      
      spinner.start('Loading shows...');
      
      const shows = options.enabledOnly 
        ? await showService.getEnabledShows()
        : await showService.getAllShows();
      
      spinner.succeed(`Loaded ${shows.length} shows`);
      
      if (shows.length === 0) {
        console.log(chalk.yellow('No shows found. Add a show with `nhktool add-show <url>`'));
        return;
      }
      
      // Display shows in a table
      const table = new Table({
        head: [
          chalk.cyan('Name'), 
          chalk.cyan('NHK ID'),
          chalk.cyan('Episodes'),
          chalk.cyan('Status'),
          chalk.cyan('Downloads'),
          chalk.cyan('Last Updated')
        ]
      });
      
      for (const show of shows) {
        const status = show.state.enabled 
          ? chalk.green('Enabled')
          : chalk.red('Disabled');
        
        const downloads = `${show.state.downloads.successful}/${show.state.downloads.total}`;
        
        const lastUpdated = show.state.lastUpdate
          ? new Date(show.state.lastUpdate).toLocaleString()
          : 'Never';
        
        table.push([
          show.name,
          show.nhkId,
          show.state.episodeCount,
          status,
          downloads,
          lastUpdated
        ]);
      }
      
      console.log(table.toString());
      
    } catch (error) {
      spinner.fail(`Error: ${error.message}`);
      console.error(chalk.red(error.stack));
      process.exit(1);
    }
  });

program
  .command('add-show')
  .description('Add a new show to monitor')
  .argument('<url>', 'NHK show URL')
  .option('-n, --name <name>', 'Custom name for the show')
  .action(async (url, options) => {
    const spinner = ora('Initializing application...').start();
    
    try {
      await app.initialize();
      spinner.succeed('Application initialized');
      
      const showService = app.getShowService();
      
      spinner.start('Adding show...');
      
      // Extract NHK ID from URL
      const nhkIdMatch = url.match(/shows\/([^\/]+)/);
      
      if (!nhkIdMatch) {
        spinner.fail('Invalid NHK show URL format');
        return;
      }
      
      const nhkId = nhkIdMatch[1];
      
      // Create show data
      const showData = {
        nhkId,
        name: options.name || nhkId,
        url,
      };
      
      // Add show
      const show = await showService.addShow(showData);
      
      spinner.succeed(`Added show "${show.name}" (${show.nhkId})`);
      
      // If Sonarr integration is available, ask to match with Sonarr
      if (app.hasSonarrIntegration()) {
        const { matchSonarr } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'matchSonarr',
            message: 'Do you want to match this show with a Sonarr series?',
            default: true
          }
        ]);
        
        if (matchSonarr) {
          await matchShowWithSonarr(show.nhkId);
        }
      }
      
      // Ask if user wants to fetch episodes
      const { fetchEpisodes } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'fetchEpisodes',
          message: 'Do you want to fetch episodes for this show now?',
          default: true
        }
      ]);
      
      if (fetchEpisodes) {
        await fetchShowEpisodes(show.nhkId);
      }
      
    } catch (error) {
      spinner.fail(`Error: ${error.message}`);
      console.error(chalk.red(error.stack));
      process.exit(1);
    }
  });

program
  .command('update-show')
  .description('Update a show\'s configuration')
  .argument('<nhkId>', 'NHK show ID')
  .option('-n, --name <name>', 'New name for the show')
  .option('-e, --enable', 'Enable the show')
  .option('-d, --disable', 'Disable the show')
  .action(async (nhkId, options) => {
    const spinner = ora('Initializing application...').start();
    
    try {
      await app.initialize();
      spinner.succeed('Application initialized');
      
      const showService = app.getShowService();
      
      // Get show
      spinner.start(`Loading show ${nhkId}...`);
      const show = await showService.getShowByNhkId(nhkId);
      
      if (!show) {
        spinner.fail(`Show with NHK ID ${nhkId} not found`);
        return;
      }
      
      spinner.succeed(`Loaded show "${show.name}"`);
      
      // Apply updates
      const updates = {};
      
      if (options.name) {
        updates.name = options.name;
      }
      
      // Handle enable/disable
      if (options.enable) {
        await showService.setShowEnabled(nhkId, true);
        console.log(chalk.green(`Show "${show.name}" has been enabled`));
      } else if (options.disable) {
        await showService.setShowEnabled(nhkId, false);
        console.log(chalk.yellow(`Show "${show.name}" has been disabled`));
      }
      
      // Apply other updates if any
      if (Object.keys(updates).length > 0) {
        spinner.start('Updating show...');
        const updatedShow = await showService.updateShow(nhkId, updates);
        spinner.succeed(`Show "${updatedShow.name}" has been updated`);
      }
      
    } catch (error) {
      spinner.fail(`Error: ${error.message}`);
      console.error(chalk.red(error.stack));
      process.exit(1);
    }
  });

program
  .command('fetch-episodes')
  .description('Fetch episodes for a show or all enabled shows')
  .argument('[nhkId]', 'NHK show ID (optional, fetches all enabled shows if not specified)')
  .action(async (nhkId) => {
    const spinner = ora('Initializing application...').start();
    
    try {
      await app.initialize();
      spinner.succeed('Application initialized');
      
      if (nhkId) {
        // Fetch episodes for specific show
        await fetchShowEpisodes(nhkId);
      } else {
        // Fetch episodes for all enabled shows
        spinner.start('Loading enabled shows...');
        
        const showService = app.getShowService();
        const shows = await showService.getEnabledShows();
        
        spinner.succeed(`Loaded ${shows.length} enabled shows`);
        
        if (shows.length === 0) {
          console.log(chalk.yellow('No enabled shows found'));
          return;
        }
        
        // Fetch episodes for each show
        let totalNewEpisodes = 0;
        
        for (const show of shows) {
          spinner.start(`Fetching episodes for ${show.name}...`);
          
          try {
            const episodes = await showService.fetchNhkEpisodes(show.nhkId);
            const newEpisodeCount = episodes.length - show.state.episodeCount;
            
            if (newEpisodeCount > 0) {
              spinner.succeed(`Found ${newEpisodeCount} new episodes for ${show.name}`);
              totalNewEpisodes += newEpisodeCount;
            } else {
              spinner.succeed(`No new episodes for ${show.name}`);
            }
          } catch (error) {
            spinner.fail(`Error fetching episodes for ${show.name}: ${error.message}`);
          }
        }
        
        console.log(chalk.green(`Fetched ${totalNewEpisodes} new episodes across all shows`));
      }
    } catch (error) {
      spinner.fail(`Error: ${error.message}`);
      console.error(chalk.red(error.stack));
      process.exit(1);
    }
  });

program
  .command('episodes')
  .description('List episodes for a show')
  .argument('<nhkId>', 'NHK show ID')
  .option('-a, --all', 'Show all episodes (default: show only unwatched)')
  .option('-d, --downloaded', 'Show only downloaded episodes')
  .action(async (nhkId, options) => {
    const spinner = ora('Initializing application...').start();
    
    try {
      await app.initialize();
      spinner.succeed('Application initialized');
      
      const showService = app.getShowService();
      
      // Get show
      spinner.start(`Loading show ${nhkId}...`);
      const show = await showService.getShowByNhkId(nhkId);
      
      if (!show) {
        spinner.fail(`Show with NHK ID ${nhkId} not found`);
        return;
      }
      
      // Get episodes
      spinner.text = `Loading episodes for ${show.name}...`;
      const episodes = await showService.getEpisodes(nhkId);
      spinner.succeed(`Loaded ${episodes.length} episodes for ${show.name}`);
      
      if (episodes.length === 0) {
        console.log(chalk.yellow('No episodes found. Fetch episodes with `nhktool fetch-episodes`'));
        return;
      }
      
      // Filter episodes
      let filteredEpisodes = [...episodes];
      
      if (options.downloaded) {
        filteredEpisodes = filteredEpisodes.filter(
          ep => ep.downloadStatus && ep.downloadStatus.downloaded
        );
      }
      
      console.log(chalk.cyan(`Showing ${filteredEpisodes.length} episodes for ${show.name}:`));
      
      // Display episodes in a table
      const table = new Table({
        head: [
          chalk.cyan('#'), 
          chalk.cyan('Title'),
          chalk.cyan('Status'),
          chalk.cyan('Sonarr'),
          chalk.cyan('Date')
        ]
      });
      
      filteredEpisodes.forEach((episode, index) => {
        const status = episode.downloadStatus && episode.downloadStatus.downloaded
          ? chalk.green('Downloaded')
          : chalk.yellow('Not downloaded');
        
        const sonarrInfo = episode.sonarr
          ? chalk.blue(`S${episode.sonarr.seasonNumber}E${episode.sonarr.episodeNumber}`)
          : chalk.gray('Not matched');
        
        const date = episode.publishDate
          ? new Date(episode.publishDate).toLocaleDateString()
          : chalk.gray('Unknown');
        
        table.push([
          index + 1,
          episode.title,
          status,
          sonarrInfo,
          date
        ]);
      });
      
      console.log(table.toString());
      
    } catch (error) {
      spinner.fail(`Error: ${error.message}`);
      console.error(chalk.red(error.stack));
      process.exit(1);
    }
  });

// Download commands
program
  .command('download')
  .description('Download episodes for a show')
  .argument('<nhkId>', 'NHK show ID')
  .option('-a, --all', 'Download all episodes')
  .option('-n, --newest <count>', 'Download newest N episodes', parseInt)
  .option('-e, --episode <episodeId>', 'Download specific episode by ID')
  .action(async (nhkId, options) => {
    const spinner = ora('Initializing application...').start();
    
    try {
      await app.initialize();
      spinner.succeed('Application initialized');
      
      const showService = app.getShowService();
      const downloadService = app.getDownloadService();
      
      // Get show
      spinner.start(`Loading show ${nhkId}...`);
      const show = await showService.getShowByNhkId(nhkId);
      
      if (!show) {
        spinner.fail(`Show with NHK ID ${nhkId} not found`);
        return;
      }
      
      // Get episodes
      spinner.text = `Loading episodes for ${show.name}...`;
      let episodes = await showService.getEpisodes(nhkId);
      spinner.succeed(`Loaded ${episodes.length} episodes for ${show.name}`);
      
      if (episodes.length === 0) {
        spinner.fail('No episodes found. Fetch episodes first with `nhktool fetch-episodes`');
        return;
      }
      
      let episodesToDownload = [];
      
      if (options.episode) {
        // Download specific episode
        const episode = episodes.find(ep => ep.nhkId === options.episode);
        
        if (!episode) {
          spinner.fail(`Episode with ID ${options.episode} not found`);
          return;
        }
        
        episodesToDownload = [episode];
      } else if (options.newest) {
        // Download newest N episodes
        episodesToDownload = episodes
          .filter(ep => !ep.downloadStatus || !ep.downloadStatus.downloaded)
          .sort((a, b) => {
            const dateA = a.publishDate ? new Date(a.publishDate) : new Date(0);
            const dateB = b.publishDate ? new Date(b.publishDate) : new Date(0);
            return dateB - dateA; // Descending order
          })
          .slice(0, options.newest);
      } else if (options.all) {
        // Download all episodes
        episodesToDownload = episodes.filter(
          ep => !ep.downloadStatus || !ep.downloadStatus.downloaded
        );
      } else {
        // No option specified, ask user what to download
        spinner.stop();
        
        const undownloaded = episodes.filter(
          ep => !ep.downloadStatus || !ep.downloadStatus.downloaded
        );
        
        if (undownloaded.length === 0) {
          console.log(chalk.green('All episodes have been downloaded already'));
          return;
        }
        
        const { downloadOption } = await inquirer.prompt([
          {
            type: 'list',
            name: 'downloadOption',
            message: `${undownloaded.length} episodes available to download. What would you like to do?`,
            choices: [
              { name: `Download all ${undownloaded.length} episodes`, value: 'all' },
              { name: 'Download newest episode', value: 'newest' },
              { name: 'Select episodes to download', value: 'select' },
              { name: 'Cancel', value: 'cancel' }
            ]
          }
        ]);
        
        if (downloadOption === 'cancel') {
          console.log(chalk.yellow('Download canceled'));
          return;
        } else if (downloadOption === 'all') {
          episodesToDownload = undownloaded;
        } else if (downloadOption === 'newest') {
          episodesToDownload = [undownloaded.sort((a, b) => {
            const dateA = a.publishDate ? new Date(a.publishDate) : new Date(0);
            const dateB = b.publishDate ? new Date(b.publishDate) : new Date(0);
            return dateB - dateA; // Descending order
          })[0]];
        } else if (downloadOption === 'select') {
          const { selectedEpisodes } = await inquirer.prompt([
            {
              type: 'checkbox',
              name: 'selectedEpisodes',
              message: 'Select episodes to download:',
              choices: undownloaded.map((ep, i) => ({
                name: `${i + 1}. ${ep.title}`,
                value: ep.nhkId,
                short: ep.title
              }))
            }
          ]);
          
          if (!selectedEpisodes.length) {
            console.log(chalk.yellow('No episodes selected for download'));
            return;
          }
          
          episodesToDownload = undownloaded.filter(ep => 
            selectedEpisodes.includes(ep.nhkId)
          );
        }
      }
      
      if (episodesToDownload.length === 0) {
        console.log(chalk.yellow('No episodes to download'));
        return;
      }
      
      console.log(chalk.blue(`Queueing ${episodesToDownload.length} episodes for download:`));
      
      for (const episode of episodesToDownload) {
        console.log(chalk.cyan(`- ${episode.title}`));
      }
      
      // Queue episodes for download
      spinner.start('Queueing episodes for download...');
      
      const queueResult = await downloadService.queueEpisodes(
        episodesToDownload.map(ep => ep.nhkId)
      );
      
      spinner.succeed(`Queued ${queueResult.queued} episodes for download`);
      
      if (queueResult.alreadyQueued > 0) {
        console.log(chalk.yellow(`${queueResult.alreadyQueued} episodes were already in queue`));
      }
      
      if (queueResult.alreadyDownloaded > 0) {
        console.log(chalk.yellow(`${queueResult.alreadyDownloaded} episodes were already downloaded`));
      }
      
      if (queueResult.failed > 0) {
        console.log(chalk.red(`Failed to queue ${queueResult.failed} episodes`));
      }
      
      // Display queue status
      const queueStatus = downloadService.getQueueStatus();
      
      console.log(chalk.blue(`\nDownload queue status:`));
      console.log(`- Queue length: ${queueStatus.queueLength}`);
      console.log(`- Active downloads: ${queueStatus.activeDownloads}`);
      console.log(`- Queue processing: ${queueStatus.isProcessing ? 'Yes' : 'No'}`);
      
    } catch (error) {
      spinner.fail(`Error: ${error.message}`);
      console.error(chalk.red(error.stack));
      process.exit(1);
    }
  });

program
  .command('sonarr')
  .description('Manage Sonarr integration')
  .argument('<action>', 'Action to perform: match, sync, list, config')
  .argument('[nhkId]', 'NHK show ID (required for match and sync actions)')
  .action(async (action, nhkId) => {
    const spinner = ora('Initializing application...').start();
    
    try {
      await app.initialize();
      spinner.succeed('Application initialized');
      
      if (!app.hasSonarrIntegration()) {
        spinner.fail('Sonarr integration is not available. Please check your configuration.');
        return;
      }
      
      if (action === 'match' && nhkId) {
        await matchShowWithSonarr(nhkId);
      } else if (action === 'sync' && nhkId) {
        await syncShowWithSonarr(nhkId);
      } else if (action === 'list') {
        await listSonarrShows();
      } else if (action === 'config') {
        await configureSonarr();
      } else {
        spinner.fail(`Invalid action or missing nhkId. Use: sonarr <match|sync|list|config> [nhkId]`);
      }
    } catch (error) {
      spinner.fail(`Error: ${error.message}`);
      console.error(chalk.red(error.stack));
      process.exit(1);
    }
  });

// Helper functions
async function fetchShowEpisodes(nhkId) {
  const spinner = ora(`Fetching episodes for show ${nhkId}...`).start();
  
  try {
    const showService = app.getShowService();
    
    // Get show
    const show = await showService.getShowByNhkId(nhkId);
    
    if (!show) {
      spinner.fail(`Show with NHK ID ${nhkId} not found`);
      return;
    }
    
    spinner.text = `Fetching episodes for ${show.name}...`;
    
    const episodes = await showService.fetchNhkEpisodes(nhkId);
    
    spinner.succeed(`Fetched ${episodes.length} episodes for ${show.name}`);
    
    // If Sonarr integration is available, ask to sync episodes
    if (app.hasSonarrIntegration() && show.sonarrId) {
      const { syncSonarr } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'syncSonarr',
          message: 'Do you want to sync episodes with Sonarr?',
          default: true
        }
      ]);
      
      if (syncSonarr) {
        await syncShowWithSonarr(nhkId);
      }
    }
    
    return episodes;
  } catch (error) {
    spinner.fail(`Error fetching episodes: ${error.message}`);
    throw error;
  }
}

async function matchShowWithSonarr(nhkId) {
  const spinner = ora(`Matching show ${nhkId} with Sonarr...`).start();
  
  try {
    const showService = app.getShowService();
    
    // Get show
    const show = await showService.getShowByNhkId(nhkId);
    
    if (!show) {
      spinner.fail(`Show with NHK ID ${nhkId} not found`);
      return;
    }
    
    spinner.text = `Searching for "${show.name}" in Sonarr...`;
    
    // Search for show in Sonarr
    const searchResult = await showService.matchShowWithSonarr(nhkId, show.name);
    
    if (!searchResult.matched) {
      spinner.fail(`No matches found in Sonarr for "${show.name}"`);
      
      // Ask for custom search term
      const { customSearch } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'customSearch',
          message: 'Would you like to try a different search term?',
          default: true
        }
      ]);
      
      if (customSearch) {
        const { searchTerm } = await inquirer.prompt([
          {
            type: 'input',
            name: 'searchTerm',
            message: 'Enter search term:',
            default: show.name
          }
        ]);
        
        spinner.start(`Searching for "${searchTerm}" in Sonarr...`);
        
        const newSearchResult = await showService.matchShowWithSonarr(nhkId, searchTerm);
        
        if (!newSearchResult.matched) {
          spinner.fail(`No matches found in Sonarr for "${searchTerm}"`);
          return;
        }
        
        searchResult.results = newSearchResult.results;
        searchResult.matched = true;
      } else {
        return;
      }
    }
    
    spinner.succeed(`Found ${searchResult.results.length} potential matches in Sonarr`);
    
    // Prompt user to select a match
    const { selectedId } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedId',
        message: 'Select the correct match:',
        choices: [
          ...searchResult.results.map(series => ({
            name: `${series.title} (${series.year}) - ${series.network || 'Unknown network'}`,
            value: series.id,
            short: series.title
          })),
          { name: 'None of these', value: null }
        ]
      }
    ]);
    
    if (selectedId === null) {
      console.log(chalk.yellow('No match selected'));
      return;
    }
    
    // Link show with selected Sonarr series
    spinner.start(`Linking show "${show.name}" with selected Sonarr series...`);
    
    const updatedShow = await showService.linkShowWithSonarr(nhkId, selectedId);
    
    spinner.succeed(`Show "${updatedShow.name}" linked with Sonarr series "${updatedShow.sonarrTitle}"`);
    
    // Ask to sync episodes
    const { syncEpisodes } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'syncEpisodes',
        message: 'Do you want to sync episodes with Sonarr now?',
        default: true
      }
    ]);
    
    if (syncEpisodes) {
      await syncShowWithSonarr(nhkId);
    }
    
  } catch (error) {
    spinner.fail(`Error matching show with Sonarr: ${error.message}`);
    throw error;
  }
}

async function syncShowWithSonarr(nhkId) {
  const spinner = ora(`Syncing show ${nhkId} with Sonarr...`).start();
  
  try {
    const showService = app.getShowService();
    
    // Get show
    const show = await showService.getShowByNhkId(nhkId);
    
    if (!show) {
      spinner.fail(`Show with NHK ID ${nhkId} not found`);
      return;
    }
    
    if (!show.sonarrId) {
      spinner.fail(`Show "${show.name}" is not linked with Sonarr`);
      
      // Ask to match show
      const { matchShow } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'matchShow',
          message: 'Would you like to match this show with Sonarr first?',
          default: true
        }
      ]);
      
      if (matchShow) {
        await matchShowWithSonarr(nhkId);
        
        // Get updated show
        const updatedShow = await showService.getShowByNhkId(nhkId);
        
        if (!updatedShow.sonarrId) {
          return;
        }
      } else {
        return;
      }
    }
    
    spinner.text = `Syncing episodes for ${show.name} with Sonarr...`;
    
    // Sync episodes with Sonarr
    const syncResult = await showService.syncEpisodesWithSonarr(nhkId);
    
    if (!syncResult.synced) {
      spinner.fail(`Failed to sync episodes for ${show.name} with Sonarr`);
      return;
    }
    
    spinner.succeed(`Synced ${syncResult.matchedCount}/${syncResult.totalEpisodes} episodes with Sonarr`);
    
    if (syncResult.unmatched.length > 0) {
      console.log(chalk.yellow(`${syncResult.unmatched.length} episodes couldn't be matched:`));
      
      for (const title of syncResult.unmatched) {
        console.log(chalk.yellow(`- ${title}`));
      }
    }
    
  } catch (error) {
    spinner.fail(`Error syncing with Sonarr: ${error.message}`);
    throw error;
  }
}

async function listSonarrShows() {
  const spinner = ora('Fetching shows from Sonarr...').start();
  
  try {
    if (!app.hasSonarrIntegration()) {
      spinner.fail('Sonarr integration is not available');
      return;
    }
    
    // Get Sonarr API client
    const sonarrApiClient = app.apiClients.sonarr;
    
    // Get all series from Sonarr
    const series = await sonarrApiClient.getSeries();
    
    spinner.succeed(`Fetched ${series.length} shows from Sonarr`);
    
    if (series.length === 0) {
      console.log(chalk.yellow('No shows found in Sonarr'));
      return;
    }
    
    // Display shows in a table
    const table = new Table({
      head: [
        chalk.cyan('ID'), 
        chalk.cyan('Title'),
        chalk.cyan('Seasons'),
        chalk.cyan('Status'),
        chalk.cyan('Path')
      ]
    });
    
    for (const show of series) {
      const status = show.status || 'Unknown';
      
      table.push([
        show.id,
        show.title,
        show.seasonCount || 0,
        status,
        show.path
      ]);
    }
    
    console.log(table.toString());
    
  } catch (error) {
    spinner.fail(`Error fetching Sonarr shows: ${error.message}`);
    throw error;
  }
}

async function configureSonarr() {
  try {
    const configManager = app.getConfigManager();
    const appConfig = await configManager.getConfig('app');
    
    // Get current Sonarr config
    const sonarrConfig = appConfig.sonarr || {
      baseUrl: 'http://localhost:8989',
      apiKey: '',
      enabled: false
    };
    
    // Prompt for new configuration
    const config = await inquirer.prompt([
      {
        type: 'input',
        name: 'baseUrl',
        message: 'Sonarr Base URL:',
        default: sonarrConfig.baseUrl
      },
      {
        type: 'input',
        name: 'apiKey',
        message: 'Sonarr API Key:',
        default: sonarrConfig.apiKey
      },
      {
        type: 'confirm',
        name: 'enabled',
        message: 'Enable Sonarr integration?',
        default: true
      }
    ]);
    
    // Update configuration
    appConfig.sonarr = config;
    
    await configManager.saveConfig('app', appConfig);
    
    console.log(chalk.green('Sonarr configuration updated'));
    
    // Test connection
    console.log(chalk.blue('Testing connection to Sonarr...'));
    
    const sonarrApiClient = new SonarrApiClient({
      baseUrl: config.baseUrl,
      apiKey: config.apiKey
    });
    
    const connected = await sonarrApiClient.testConnection();
    
    if (connected) {
      console.log(chalk.green('Successfully connected to Sonarr'));
    } else {
      console.log(chalk.red('Failed to connect to Sonarr. Please check your configuration.'));
    }
    
  } catch (error) {
    console.error(chalk.red(`Error configuring Sonarr: ${error.message}`));
    throw error;
  }
}

// Parse command line arguments
program.parse();

// If no command is specified, show help
if (!process.argv.slice(2).length) {
  program.help();
}