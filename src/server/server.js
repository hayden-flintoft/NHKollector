// filepath: /home/hflin/nhktool/src/server/server.js
const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const chalk = require('chalk');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import services
const VideoDownloader = require('./ytdlp-wrapper');
const ShowService = require('../application/services/ShowService');
const DownloadService = require('../application/services/DownloadService');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Initialize services
const downloader = new VideoDownloader();
const showService = new ShowService();
const downloadService = new DownloadService();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the client/dist directory (after build)
app.use(express.static(path.join(__dirname, '../../client/dist')));

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Shows API
app.get('/api/shows', async (req, res) => {
  try {
    const shows = await showService.getAllShows();
    console.log(chalk.blue(`📋 Retrieved ${shows.length} shows`));
    res.json(shows);
  } catch (error) {
    console.error(chalk.red('❌ Error retrieving shows:'), error.message);
    res.status(500).json({ error: error.message });
  }
});

// Episodes API
app.get('/api/episodes/:showName', async (req, res) => {
  try {
    const { showName } = req.params;
    console.log(chalk.blue(`🔍 Fetching episodes for ${showName}`));
    const episodes = await downloader.getAvailableEpisodes(
      `https://www3.nhk.or.jp/nhkworld/en/shows/${showName}/`
    );
    res.json(episodes);
  } catch (error) {
    console.error(chalk.red('❌ Error fetching episodes:'), error.message);
    res.status(500).json({ error: error.message });
  }
});

// Download API
app.post('/api/download', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    console.log(chalk.blue(`⏬ Processing download for: ${url}`));
    const result = await downloadService.downloadEpisode(url);
    res.json(result);
  } catch (error) {
    console.error(chalk.red('❌ Download failed:'), error.message);
    res.status(500).json({ error: error.message });
  }
});

// Catch-all route to serve the frontend for any other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
});

// Start server
async function startServer() {
  try {
    // Initialize services
    await downloader.init();
    await showService.init();
    
    // Start Express server
    app.listen(PORT, () => {
      console.log(chalk.green(`✅ Server running on http://localhost:${PORT}`));
      console.log(chalk.blue('🔄 API endpoints:'));
      console.log(chalk.gray(' - GET  /api/health'));
      console.log(chalk.gray(' - GET  /api/shows'));
      console.log(chalk.gray(' - GET  /api/episodes/:showName'));
      console.log(chalk.gray(' - POST /api/download'));
    });
  } catch (error) {
    console.error(chalk.red('❌ Failed to start server:'), error.message);
    process.exit(1);
  }
}

// Run the server
startServer();

module.exports = app; // Export for testing