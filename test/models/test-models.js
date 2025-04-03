const Show = require('../../src/models/Show')
const Episode = require('../../src/models/Episode')
const assert = require('assert')
const fs = require('fs-extra')
const path = require('path')

describe('Models', () => {
  // Setup test data
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

  const testEpisode = {
    nhkId: '2007551',
    title: 'Hida: Deep Winter Escape',
    url: '/nhkworld/en/shows/journeys/2007551/',
    show: 'Journeys in Japan',
    tvdb: {
      seasonNumber: 16,
      episodeNumber: 7,
      title: 'Hida: Deep Winter Escape',
    },
  }

  describe('Show', () => {
    let show

    beforeEach(async () => {
      show = new Show(testShow)
      await fs.ensureDir(path.join(__dirname, '../../data/shows'))
    })

    it('should validate valid show data', async () => {
      await assert.doesNotReject(show.validate())
    })

    it('should reject invalid show data', async () => {
      const invalidShow = new Show({ name: 'Test' })
      await assert.rejects(invalidShow.validate())
    })

    it('should save and load state', async () => {
      show.state.lastChecked = new Date().toISOString()
      await show.saveState()
      await show.loadState()
      assert(show.state.lastChecked)
    })

    afterEach(async () => {
      // Cleanup
      const stateDir = path.join(
        __dirname,
        '../../data/shows',
        show.name.toLowerCase()
      )
      await fs.remove(stateDir)
    })
  })

  describe('Episode', () => {
    it('should generate correct filename with TVDB data', () => {
      const episode = new Episode(testEpisode)
      const expected = 'Journeys in Japan.S16E07.Hida Deep Winter Escape.mp4'
      assert.equal(episode.toFileName(), expected)
    })

    it('should generate fallback filename without TVDB data', () => {
      const episode = new Episode({
        ...testEpisode,
        tvdb: null,
      })
      const expected = 'Journeys in Japan.2007551.mp4'
      assert.equal(episode.toFileName(), expected)
    })

    it('should validate episode data', () => {
      const episode = new Episode(testEpisode)
      assert.doesNotThrow(() => episode.validate())
    })

    it('should reject invalid episode data', () => {
      const invalidEpisode = new Episode({ title: 'Test' })
      assert.throws(() => invalidEpisode.validate())
    })
  })
})
