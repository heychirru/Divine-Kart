import { getRedisClient } from '../config/redis.js';

const redis = getRedisClient();

/**
 * Cache data with an expiration time
 * @param {string} key - Cache key
 * @param {any} value - Value to cache
 * @param {number} expirySeconds - Expiration time in seconds (default: 3600 = 1 hour)
 */
export const cacheData = async (key, value, expirySeconds = 3600) => {
  try {
    if (!redis) return null;
    await redis.setEx(key, expirySeconds, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error('❌ Cache Error (set):', error);
    return null;
  }
};

/**
 * Retrieve cached data
 * @param {string} key - Cache key
 */
export const getCachedData = async (key) => {
  try {
    if (!redis) return null;
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('❌ Cache Error (get):', error);
    return null;
  }
};

/**
 * Delete cached data
 * @param {string} key - Cache key
 */
export const deleteCachedData = async (key) => {
  try {
    if (!redis) return null;
    await redis.del(key);
    return true;
  } catch (error) {
    console.error('❌ Cache Error (delete):', error);
    return null;
  }
};

/**
 * Delete multiple cached keys
 * @param {string[]} keys - Array of cache keys
 */
export const deleteMultipleCachedData = async (keys) => {
  try {
    if (!redis || keys.length === 0) return null;
    await redis.del(keys);
    return true;
  } catch (error) {
    console.error('❌ Cache Error (delete multiple):', error);
    return null;
  }
};

/**
 * Clear all cache
 */
export const clearAllCache = async () => {
  try {
    if (!redis) return null;
    await redis.flushDb();
    return true;
  } catch (error) {
    console.error('❌ Cache Error (flush):', error);
    return null;
  }
};

/**
 * Increment a counter in Redis
 * @param {string} key - Cache key
 * @param {number} increment - Amount to increment (default: 1)
 */
export const incrementCounter = async (key, increment = 1) => {
  try {
    if (!redis) return null;
    return await redis.incrBy(key, increment);
  } catch (error) {
    console.error('❌ Cache Error (increment):', error);
    return null;
  }
};

/**
 * Decrement a counter in Redis
 * @param {string} key - Cache key
 * @param {number} decrement - Amount to decrement (default: 1)
 */
export const decrementCounter = async (key, decrement = 1) => {
  try {
    if (!redis) return null;
    return await redis.decrBy(key, decrement);
  } catch (error) {
    console.error('❌ Cache Error (decrement):', error);
    return null;
  }
};
