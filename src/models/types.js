/**
 * @typedef {Object} ShowConfig
 * @property {string} nhkId - NHK show identifier
 * @property {string} name - Show name
 * @property {string} url - NHK show URL
 * @property {number} tvdbId - TVDB series ID
 * @property {Object} metadata - Additional metadata
 * @property {string} metadata.network - Broadcasting network
 * @property {string} metadata.language - Original language
 * @property {string} metadata.country - Country of origin
 */

/**
 * @typedef {Object} EpisodeData
 * @property {string} nhkId - NHK episode identifier
 * @property {string} title - Episode title
 * @property {string} url - Episode URL
 * @property {string} show - Show name
 * @property {Object} [tvdb] - TVDB metadata if matched
 * @property {number} [tvdb.seasonNumber] - Season number
 * @property {number} [tvdb.episodeNumber] - Episode number
 * @property {string} [tvdb.title] - TVDB episode title
 * @property {string} [tvdb.aired] - Original air date
 */
