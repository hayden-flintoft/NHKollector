const path = require('path')
const fs = require('fs-extra')
const chalk = require('chalk')

class BaseDownloader {
  constructor(config = {}) {
    this.downloadDir = path.join(__dirname, '../../../downloads')
    this.metadataDir = path.join(__dirname, '../../../metadata')
    this.debugDir = path.join(__dirname, '../../../debug')
  }

  async init() {
    await fs.ensureDir(this.downloadDir)
    await fs.ensureDir(this.metadataDir)
    await fs.ensureDir(this.debugDir)
  }

  async saveDebugData(prefix, data) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const debugFile = path.join(this.debugDir, `${prefix}-${timestamp}.json`)
    await fs.writeJson(debugFile, data, { spaces: 2 })
    return debugFile
  }
}

module.exports = BaseDownloader
