import redis from 'redis';

let redisClient = null;
let connectionAttempted = false;
let connectionFailed = false;

export const connectRedis = async () => {
  if (connectionAttempted) {
    return redisClient;
  }
  
  connectionAttempted = true;

  try {
    // Support both REDIS_URL and individual host/port/password config
    const redisConfig = process.env.REDIS_URL 
      ? { url: process.env.REDIS_URL }
      : {
          host: process.env.REDIS_HOST || 'localhost',
          port: process.env.REDIS_PORT || 6379,
          password: process.env.REDIS_PASSWORD || undefined,
        };

    redisClient = redis.createClient({
      ...redisConfig,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            if (!connectionFailed) {
              console.warn('⚠️ Redis max reconnection attempts reached. Continuing without Redis cache.');
              connectionFailed = true;
            }
            return new Error('Redis max reconnection attempts');
          }
          return retries * 50;
        }
      }
    });

    redisClient.on('error', (err) => {
      // Only log connection errors if we haven't already logged a failure
      if (!connectionFailed && err.code === 'ECONNREFUSED') {
        console.warn('⚠️ Redis is not available. The application will continue without caching.');
        console.warn('   To enable Redis caching, start Redis or use Docker: docker-compose up redis');
        connectionFailed = true;
      }
      // Suppress other errors after initial failure to avoid spam
    });

    redisClient.on('connect', () => {
      console.log('✅ Redis connected successfully');
      connectionFailed = false;
    });

    redisClient.on('disconnect', () => {
      if (!connectionFailed) {
        console.log('⚠️ Redis disconnected');
      }
    });

    await redisClient.connect();

    return redisClient;
  } catch (err) {
    if (err.code === 'ECONNREFUSED') {
      console.warn('⚠️ Redis is not available. The application will continue without caching.');
      console.warn('   To enable Redis caching, start Redis or use Docker: docker-compose up redis');
    } else {
      console.warn('⚠️ Redis connection failed:', err.message);
      console.warn('   The application will continue without caching.');
    }
    connectionFailed = true;
    redisClient = null;
    // Don't exit - Redis is optional for the app to function
    return null;
  }
};

export const getRedisClient = () => redisClient;

export default redisClient;
