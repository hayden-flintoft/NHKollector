// filepath: /home/hflin/nhktool/src/core/repositories/BaseRepository.js
/**
 * Base Repository Interface
 * Defines standard operations for all repositories
 */
class BaseRepository {
  /**
   * Get all entities
   * @returns {Promise<Array>}
   */
  async getAll() {
    throw new Error('Method not implemented');
  }

  /**
   * Find entity by ID
   * @param {string} id - Entity ID
   * @returns {Promise<Object|null>}
   */
  async getById(id) {
    throw new Error('Method not implemented');
  }

  /**
   * Create a new entity
   * @param {Object} entity - Entity to create
   * @returns {Promise<Object>}
   */
  async create(entity) {
    throw new Error('Method not implemented');
  }

  /**
   * Update an existing entity
   * @param {string} id - Entity ID
   * @param {Object} entity - Updated entity data
   * @returns {Promise<Object>}
   */
  async update(id, entity) {
    throw new Error('Method not implemented');
  }

  /**
   * Delete an entity
   * @param {string} id - Entity ID
   * @returns {Promise<boolean>}
   */
  async delete(id) {
    throw new Error('Method not implemented');
  }
  
  /**
   * Find entities by custom criteria
   * @param {Function} predicate - Filter function
   * @returns {Promise<Array>}
   */
  async find(predicate) {
    throw new Error('Method not implemented');
  }
}

module.exports = BaseRepository;