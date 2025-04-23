const xml2js = require('xml2js');

class FeedGenerator {
  constructor(config) {
    this.config = config;
    this.builder = new xml2js.Builder({
      xmldec: { version: '1.0', encoding: 'UTF-8' }
    });
  }

  generateCapsXml() {
    const cats = this.config.getCategories();
    const caps = {
      caps: {
        server: {
          version: '1.0',
          title: 'NHK World Indexer',
          url: this.config.baseUrl
        },
        limits: {
          max: 100,
          default: 25
        },
        searching: {
          search: { available: "yes" },
          tv-search: { available: "yes", supportedParams: "q,season,ep,tvdbid" },
          movie-search: { available: "no" }
        },
        categories: {
          category: [
            { id: cats.TV, name: "TV" },
            { id: cats.TV_DOCUMENTARY, name: "TV/Documentary" }
          ]
        }
      }
    };

    return this.builder.buildObject(caps);
  }

  generateSearchXml(episodes) {
    const items = episodes.map(episode => {
      const pubDate = new Date(episode.date);
      const categories = this.config.getShowCategories(episode.nhkId);

      return {
        title: `[NHK] ${episode.title}`,
        guid: { _attr: { isPermaLink: "true" }, _text: episode.nhkId },
        link: `https://www3.nhk.or.jp${episode.url}`,
        comments: 0,
        pubDate: pubDate.toUTCString(),
        category: categories,
        description: episode.description || '',
        attr: [
          { _attr: { name: 'tvdbid', value: '254957' } },
          { _attr: { name: 'size', value: '500000000' } }, // Estimated size
          { _attr: { name: 'category', value: categories[0] } }
        ]
      };
    });

    const feed = {
      rss: {
        _attr: {
          version: '2.0',
          xmlns: 'http://www.newznab.com/DTD/2.0'
        },
        channel: {
          title: 'NHK World Indexer',
          description: 'NHK World Japan Shows',
          link: this.config.baseUrl,
          language: 'en-us',
          item: items
        }
      }
    };

    return this.builder.buildObject(feed);
  }

  generateTorznabResponse(episodes, total = 0) {
    const rssObj = {
      rss: {
        '$': {
          version: '2.0',
          'xmlns:torznab': 'http://torznab.com/schemas/2015/feed'
        },
        channel: [{
          title: 'NHK World Indexer',
          description: 'Custom Torznab feed for NHK World shows',
          language: 'en-US',
          category: this.config.getCategories(),
          item: this._generateItems(episodes)
        }]
      }
    };

    return this.builder.buildObject(rssObj);
  }

  _generateItems(episodes) {
    return episodes.map(episode => {
      const pubDate = new Date(episode.airDate);

      return {
        title: `${episode.show} - ${episode.label} - ${episode.title}`,
        guid: episode.nhkId,
        comments: episode.link || '',
        pubDate: pubDate.toUTCString(),
        size: '1073741824', // Estimate 1GB per episode
        link: episode.url,
        description: episode.description || '',
        'torznab:attr': [
          { _: episode.tvdb?.seasonNumber || '', '$': { name: 'season', value: episode.tvdb?.seasonNumber || '' } },
          { _: episode.tvdb?.episodeNumber || '', '$': { name: 'episode', value: episode.tvdb?.episodeNumber || '' } },
          { _: '1080', '$': { name: 'resolution', value: '1080p' } },
          { _: episode.tvdb?.title || episode.title, '$': { name: 'title', value: episode.tvdb?.title || episode.title } }
        ],
        category: this.config.getShowCategories(episode.nhkId)
      };
    });
  }
}

module.exports = FeedGenerator;