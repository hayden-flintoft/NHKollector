const Downloader = require('../../../src/services/download/downloader')
const Episode = require('../../../src/models/Episode')
const assert = require('assert')
const path = require('path')
const fs = require('fs-extra')

describe('Downloader', () => {
  let downloader
  let testEpisode

  beforeEach(async () => {
    downloader = new Downloader({ maxConcurrent: 1, retryAttempts: 1 })
    testEpisode = new Episode({
      nhkId: '2007550',
      title: 'Test Episode',
      url: '/nhkworld/en/shows/journeys/2007550/',
      show: 'Journeys in Japan',
      tvdb: {
        seasonNumber: 1,
        episodeNumber: 1,
        title: 'Test',
      },
    })
  })

  it('should queue download requests', async () => {
    const promise = downloader.queueDownload(testEpisode)
    assert(promise instanceof Promise)
  })

  it('should handle duplicate downloads', async () => {
    // Create fake downloaded file
    const fileName = testEpisode.toFileName()
    const filePath = path.join(downloader.downloadDir, fileName)
    await fs.ensureDir(downloader.downloadDir)
    await fs.writeFile(filePath, 'test')

    const result = await downloader.downloadEpisode(testEpisode)
    assert(result.skipped)
    assert(result.success)

    // Cleanup
    await fs.remove(filePath)
  })
})
