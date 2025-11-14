// Seeder Configuration
// This file exports configuration that can be used by the seeder service

module.exports = {
  // Signaling server URL (Google Cloud)
  signalingUrl: process.env.SIGNALING_URL || 'wss://signaling.yourdomain.com',
  
  // Tracker URLs (comma-separated)
  trackers: process.env.TRACKER_URLS ? process.env.TRACKER_URLS.split(',').map(t => t.trim()) : [
    'wss://tracker.openwebtorrent.com',
    'wss://tracker.webtorrent.dev',
    'wss://tracker.btorrent.xyz'
  ],
  
  // Chunk cache directory
  chunkCacheDir: process.env.CHUNK_CACHE_DIR || './chunks',
  
  // Maximum number of chunks to cache
  maxCachedChunks: parseInt(process.env.MAX_CACHED_CHUNKS) || 20,
  
  // Download timeout (ms)
  downloadTimeout: parseInt(process.env.DOWNLOAD_TIMEOUT) || 10000,
  
  // Enable debug logging
  enableDebug: process.env.ENABLE_DEBUG_LOGGING === 'true',
};

