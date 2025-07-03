const chalk = require('chalk')

class NotificationService {
  constructor(config = {}) {
    this.config = config
    this.enabled = config.enabled || false
  }

  async sendDownloadComplete(episode) {
    if (!this.enabled) return
    
    const message = `✅ Downloaded: ${episode.show?.name || 'Unknown Show'} - ${episode.title}`
    console.log(chalk.green(`📧 Notification: ${message}`))
    
    // TODO: Implement actual notification sending (webhook, email, etc.)
  }

  async sendDownloadFailed(episode, error) {
    if (!this.enabled) return
    
    const message = `❌ Failed: ${episode.show?.name || 'Unknown Show'} - ${episode.title}\nError: ${error}`
    console.log(chalk.red(`📧 Notification: ${message}`))
    
    // TODO: Implement actual notification sending
  }

  async sendError(title, error) {
    if (!this.enabled) return
    
    const message = `❌ ${title}: ${error}`
    console.log(chalk.red(`📧 Error Notification: ${message}`))
    
    // TODO: Implement actual notification sending
  }
}

module.exports = NotificationService