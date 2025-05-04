const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

/**
 * Configuration manager for handling application configs
 */
class ConfigManager {
  /**
   * Constructor
   * @param {Object} options Configuration options
   * @param {string} options.configDir Directory for config files
   */
  constructor(options = {}) {
    this.configDir = options.configDir || path.join(process.cwd(), 'config');
    this.configCache = new Map(); // Cache configs in memory
  }

  /**
   * Initialize the configuration manager
   * @returns {Promise<void>}
   */
  async initialize() {
    console.log(chalk.blue(`Initializing ConfigManager with config dir: ${this.configDir}`));
    
    try {
      // Ensure config directory exists
      await fs.ensureDir(this.configDir);
      
      // Load configs into cache
      const configFiles = await fs.readdir(this.configDir);
      
      for (const file of configFiles) {
        if (file.endsWith('.json')) {
          const configName = path.basename(file, '.json');
          const configPath = path.join(this.configDir, file);
          
          try {
            const configData = await fs.readJson(configPath);
            this.configCache.set(configName, configData);
            console.log(chalk.blue(`Loaded config: ${configName}`));
          } catch (error) {
            console.error(chalk.yellow(`Error loading config ${configName}: ${error.message}`));
          }
        }
      }
      
      console.log(chalk.green(`ConfigManager initialized with ${this.configCache.size} configs`));
    } catch (error) {
      console.error(chalk.red(`Error initializing ConfigManager: ${error.message}`));
      throw error;
    }
  }

  /**
   * Get a configuration by name
   * @param {string} name Name of the configuration
   * @param {Object} defaultConfig Default configuration if not found
   * @returns {Promise<Object>} Configuration object
   */
  async getConfig(name, defaultConfig = {}) {
    // Check cache first
    if (this.configCache.has(name)) {
      return { ...this.configCache.get(name) };
    }
    
    const configPath = this.getConfigPath(name);
    
    try {
      // Try to load from file
      if (await fs.pathExists(configPath)) {
        const config = await fs.readJson(configPath);
        this.configCache.set(name, config);
        return { ...config };
      } else {
        // Create default config
        await this.saveConfig(name, defaultConfig);
        return { ...defaultConfig };
      }
    } catch (error) {
      console.error(chalk.yellow(`Error reading config ${name}: ${error.message}`));
      
      // Return default config if file read fails
      await this.saveConfig(name, defaultConfig);
      return { ...defaultConfig };
    }
  }

  /**
   * Save a configuration
   * @param {string} name Name of the configuration
   * @param {Object} config Configuration object
   * @returns {Promise<void>}
   */
  async saveConfig(name, config) {
    // Update cache
    this.configCache.set(name, { ...config });
    
    const configPath = this.getConfigPath(name);
    
    try {
      // Ensure config directory exists
      await fs.ensureDir(this.configDir);
      
      // Save to file
      await fs.writeJson(configPath, config, { spaces: 2 });
      
      console.log(chalk.blue(`Saved config: ${name}`));
    } catch (error) {
      console.error(chalk.red(`Error saving config ${name}: ${error.message}`));
      throw error;
    }
  }

  /**
   * Update specific properties of a configuration
   * @param {string} name Name of the configuration
   * @param {Object} updates Properties to update
   * @returns {Promise<Object>} Updated configuration
   */
  async updateConfig(name, updates) {
    // Get current config
    const config = await this.getConfig(name, {});
    
    // Apply updates
    const updatedConfig = {
      ...config,
      ...updates
    };
    
    // Save updated config
    await this.saveConfig(name, updatedConfig);
    
    return updatedConfig;
  }

  /**
   * Delete a configuration
   * @param {string} name Name of the configuration
   * @returns {Promise<boolean>} Success status
   */
  async deleteConfig(name) {
    // Remove from cache
    this.configCache.delete(name);
    
    const configPath = this.getConfigPath(name);
    
    try {
      // Check if file exists
      if (await fs.pathExists(configPath)) {
        // Delete file
        await fs.unlink(configPath);
        console.log(chalk.blue(`Deleted config: ${name}`));
        return true;
      } else {
        console.log(chalk.yellow(`Config not found: ${name}`));
        return false;
      }
    } catch (error) {
      console.error(chalk.red(`Error deleting config ${name}: ${error.message}`));
      throw error;
    }
  }

  /**
   * Get the path to a configuration file
   * @param {string} name Name of the configuration
   * @returns {string} Path to the configuration file
   * @private
   */
  getConfigPath(name) {
    return path.join(this.configDir, `${name}.json`);
  }

  /**
   * List all available configurations
   * @returns {Promise<Array<string>>} List of configuration names
   */
  async listConfigs() {
    try {
      // Ensure config directory exists
      await fs.ensureDir(this.configDir);
      
      // Read directory
      const files = await fs.readdir(this.configDir);
      
      // Filter JSON files and extract names
      return files
        .filter(file => file.endsWith('.json'))
        .map(file => path.basename(file, '.json'));
    } catch (error) {
      console.error(chalk.red(`Error listing configs: ${error.message}`));
      throw error;
    }
  }
}

module.exports = ConfigManager;