// filepath: /home/hflin/nhktool/src/infrastructure/api/YTDLPDownloader.js
const { spawn } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

/**
 * yt-dlp wrapper for downloading videos
 */
class YTDLPDownloader {
  /**
   * Constructor
   * @param {Object} options Configuration options
   * @param {string} options.binaryPath Path to yt-dlp binary
   * @param {string} options.outputDir Base output directory
   */
  constructor(options = {}) {
    this.binaryPath = options.binaryPath || path.join(process.cwd(), 'bin', 'yt-dlp');
    this.outputDir = options.outputDir || path.join(process.cwd(), 'downloads');
    this.defaultOptions = [
      '--no-check-certificate',
      '--format', 'best',
      '--no-playlist',
      '--no-overwrites',
      '--continue',
      '--add-metadata',
      '--no-call-home'
    ];
  }

  /**
   * Initialize the downloader
   * @returns {Promise<void>}
   */
  async initialize() {
    // Ensure output directory exists
    await fs.ensureDir(this.outputDir);
    
    // Verify yt-dlp exists
    try {
      await fs.access(this.binaryPath);
      console.log(chalk.green(`yt-dlp binary found at ${this.binaryPath}`));
    } catch (error) {
      console.error(chalk.red(`yt-dlp binary not found at ${this.binaryPath}`));
      throw new Error('yt-dlp binary not found. Please install it in the bin directory.');
    }
  }

  /**
   * Get yt-dlp version
   * @returns {Promise<string>} Version string
   */
  async getVersion() {
    return new Promise((resolve, reject) => {
      const process = spawn(this.binaryPath, ['--version']);
      
      let output = '';
      process.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      process.on('close', (code) => {
        if (code === 0) {
          resolve(output.trim());
        } else {
          reject(new Error(`yt-dlp version check failed with code ${code}`));
        }
      });
      
      process.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Download a video
   * @param {Object} options Download options
   * @param {string} options.url URL to download
   * @param {string} options.outputPath Full path where to save the file
   * @param {Array<string>} options.extraArgs Additional yt-dlp arguments
   * @returns {Promise<Object>} Download result
   */
  async download({ url, outputPath, extraArgs = [] }) {
    if (!url) {
      throw new Error('URL is required for download');
    }
    
    // Ensure parent directory exists
    await fs.ensureDir(path.dirname(outputPath));
    
    console.log(chalk.blue(`Starting download for: ${url}`));
    console.log(chalk.blue(`Output path: ${outputPath}`));
    
    // Prepare arguments
    const args = [
      ...this.defaultOptions,
      '--output', outputPath,
      ...extraArgs,
      url
    ];
    
    return new Promise((resolve, reject) => {
      const ytdlProcess = spawn(this.binaryPath, args);
      
      let stdout = '';
      let stderr = '';
      
      ytdlProcess.stdout.on('data', (data) => {
        const output = data.toString();
        stdout += output;
        
        // Log download progress
        if (output.includes('%')) {
          const progressLine = output.split('\n').find(line => line.includes('%'));
          if (progressLine) {
            console.log(chalk.cyan(`Download progress: ${progressLine.trim()}`));
          }
        }
      });
      
      ytdlProcess.stderr.on('data', (data) => {
        stderr += data.toString();
        console.error(chalk.yellow(data.toString()));
      });
      
      ytdlProcess.on('close', (code) => {
        if (code === 0) {
          console.log(chalk.green(`Download completed successfully for: ${url}`));
          resolve({
            success: true,
            filePath: outputPath,
            stdout,
            stderr
          });
        } else {
          console.error(chalk.red(`Download failed with code ${code} for: ${url}`));
          reject(new Error(`Download failed with code ${code}: ${stderr}`));
        }
      });
      
      ytdlProcess.on('error', (error) => {
        console.error(chalk.red(`Download process error: ${error.message}`));
        reject(error);
      });
    });
  }
  
  /**
   * Extract video information without downloading
   * @param {string} url URL to extract info from
   * @returns {Promise<Object>} Video information
   */
  async getVideoInfo(url) {
    if (!url) {
      throw new Error('URL is required for info extraction');
    }
    
    console.log(chalk.blue(`Getting video info for: ${url}`));
    
    const args = ['--dump-json', '--no-check-certificate', url];
    
    return new Promise((resolve, reject) => {
      const process = spawn(this.binaryPath, args);
      
      let output = '';
      let errorOutput = '';
      
      process.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      process.on('close', (code) => {
        if (code === 0 && output) {
          try {
            const info = JSON.parse(output);
            console.log(chalk.green('Video info extracted successfully'));
            resolve(info);
          } catch (error) {
            console.error(chalk.red(`Failed to parse video info: ${error.message}`));
            reject(new Error(`Failed to parse video info: ${error.message}`));
          }
        } else {
          console.error(chalk.red(`Video info extraction failed with code ${code}`));
          reject(new Error(`Video info extraction failed: ${errorOutput}`));
        }
      });
      
      process.on('error', (error) => {
        console.error(chalk.red(`Process error: ${error.message}`));
        reject(error);
      });
    });
  }
  
  /**
   * Cancel an ongoing download process
   * @param {ChildProcess} downloadProcess The download process to cancel
   */
  cancelDownload(downloadProcess) {
    if (downloadProcess && downloadProcess.kill) {
      console.log(chalk.yellow('Canceling download...'));
      downloadProcess.kill();
    }
  }
}

module.exports = YTDLPDownloader;