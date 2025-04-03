const ShowManager = require('../../../src/services/show/show-manager')
const assert = require('assert')
const fs = require('fs-extra')
const path = require('path')

describe('ShowManager', () => {
  let manager
  const testShow = {
    nhkId: '2007550',
    name: 'Journeys in Japan',
    url: 'https://www3.nhk.or.jp/nhkworld/en/shows/journeys/',
    tvdbId: 254957,
    metadata: {
      network: 'NHK World',
      language: 'eng',
      country: 'jpn',
    },
  }

  beforeEach(async () => {
    manager = new ShowManager()
    await manager.init()
  })

  it('should add new show', async () => {
    const show = await manager.addShow(testShow)
    assert.equal(show.name, testShow.name)
    assert(manager.getShow(testShow.nhkId))
  })

  it('should update existing show', async () => {
    await manager.addShow(testShow)
    const updated = await manager.updateShow(testShow.nhkId, {
      name: 'Updated Name',
    })
    assert.equal(updated.name, 'Updated Name')
  })

  it('should remove show', async () => {
    await manager.addShow(testShow)
    await manager.removeShow(testShow.nhkId)
    assert(!manager.getShow(testShow.nhkId))
  })

  afterEach(async () => {
    // Cleanup test data
    const configFile = path.join(__dirname, '../../../config/shows.json')
    const dataDir = path.join(__dirname, '../../../data/shows')
    await fs.writeJson(configFile, [], { spaces: 2 })
    await fs.emptyDir(dataDir)
  })
})
