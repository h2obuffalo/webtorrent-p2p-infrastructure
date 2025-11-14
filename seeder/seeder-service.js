#!/usr/bin/env node
/**
 * On-Site Seeder Service
 * Connects to Google Cloud signaling server and seeds chunks to help P2P distribution
 */

require('dotenv').config();
const WebSocket = require('ws');
const WebTorrent = require('webtorrent');
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const { URL } = require('url');

// Configuration
const config = {
  signalingUrl: process.env.SIGNALING_URL || 'wss://signaling.yourdomain.com',
  trackers: process.env.TRACKER_URLS ? process.env.TRACKER_URLS.split(',') : [
    'wss://tracker.openwebtorrent.com',
    'wss://tracker.webtorrent.dev',
    'wss://tracker.btorrent.xyz'
  ],
  chunkCacheDir: process.env.CHUNK_CACHE_DIR || path.join(__dirname, 'chunks'),
  maxCachedChunks: parseInt(process.env.MAX_CACHED_CHUNKS) || 20,
  downloadTimeout: parseInt(process.env.DOWNLOAD_TIMEOUT) || 10000,
  enableDebug: process.env.ENABLE_DEBUG_LOGGING === 'true',
};

// State
const state = {
  ws: null,
  wtClient: null,
  activeTorrents: new Map(), // filename -> torrent
  cachedChunks: new Map(), // filename -> filepath
  chunkQueue: [],
  stats: {
    chunksSeeded: 0,
    chunksDownloaded: 0,
    totalBytesSeeded: 0,
    activePeers: 0,
  },
};

console.log('🌱 WebTorrent Seeder Service Starting...\n');
console.log('📊 Configuration:');
console.log(`   Signaling: ${config.signalingUrl}`);
console.log(`   Trackers: ${config.trackers.length}`);
console.log(`   Cache Dir: ${config.chunkCacheDir}`);
console.log(`   Max Cached: ${config.maxCachedChunks}\n`);

// Ensure cache directory exists
if (!fs.existsSync(config.chunkCacheDir)) {
  fs.mkdirSync(config.chunkCacheDir, { recursive: true });
  console.log(`✅ Created cache directory: ${config.chunkCacheDir}`);
}

// Initialize WebTorrent client
state.wtClient = new WebTorrent({
  tracker: {
    announce: config.trackers,
  },
});

state.wtClient.on('error', (err) => {
  console.error('❌ WebTorrent error:', err.message);
});

// Monitor peer count
setInterval(() => {
  let totalPeers = 0;
  state.wtClient.torrents.forEach(torrent => {
    totalPeers += torrent.numPeers;
  });
  state.stats.activePeers = totalPeers;
  
  if (config.enableDebug && totalPeers > 0) {
    console.log(`👥 Active peers: ${totalPeers}`);
  }
}, 10000);

// Connect to signaling server
function connectSignaling() {
  console.log(`🔌 Connecting to signaling server: ${config.signalingUrl}`);
  
  state.ws = new WebSocket(config.signalingUrl);
  
  state.ws.on('open', () => {
    console.log('✅ Connected to signaling server');
    console.log('   Waiting for chunk announcements...\n');
  });
  
  state.ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());
      
      if (message.type === 'manifest') {
        console.log(`📋 Received manifest with ${message.chunks.length} chunks`);
        // Download and seed recent chunks
        const recentChunks = message.chunks.slice(-config.maxCachedChunks);
        for (const chunk of recentChunks) {
          await handleChunk(chunk);
        }
      }
      
      if (message.type === 'chunk') {
        console.log(`📦 New chunk: ${message.filename}`);
        await handleChunk(message);
      }
    } catch (err) {
      console.error('❌ Error processing message:', err.message);
    }
  });
  
  state.ws.on('error', (err) => {
    console.error('❌ WebSocket error:', err.message);
  });
  
  state.ws.on('close', () => {
    console.log('⚠️  Disconnected from signaling server. Reconnecting in 5s...');
    setTimeout(connectSignaling, 5000);
  });
}

// Handle chunk announcement
async function handleChunk(chunkInfo) {
  const { filename, magnet, http: httpUrl, r2: r2Url } = chunkInfo;
  
  // Skip if already seeding
  if (state.activeTorrents.has(filename)) {
    if (config.enableDebug) {
      console.log(`   ⏭️  Already seeding: ${filename}`);
    }
    return;
  }
  
  // Download chunk via HTTP
  const chunkPath = path.join(config.chunkCacheDir, filename);
  
  try {
    // Download chunk
    const downloadUrl = r2Url || httpUrl;
    if (!downloadUrl) {
      console.warn(`   ⚠️  No download URL for ${filename}`);
      return;
    }
    
    console.log(`   ⬇️  Downloading ${filename}...`);
    const buffer = await downloadChunk(downloadUrl);
    
    // Save to disk
    fs.writeFileSync(chunkPath, buffer);
    state.cachedChunks.set(filename, chunkPath);
    state.stats.chunksDownloaded++;
    
    console.log(`   ✅ Downloaded ${filename} (${(buffer.length / 1024).toFixed(2)} KB)`);
    
    // Seed via WebTorrent
    await seedChunk(chunkPath, filename, magnet);
    
    // Cleanup old chunks
    cleanupOldChunks();
    
  } catch (err) {
    console.error(`   ❌ Failed to handle chunk ${filename}:`, err.message);
  }
}

// Download chunk via HTTP/HTTPS
function downloadChunk(url) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Download timeout'));
    }, config.downloadTimeout);
    
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    client.get(url, (res) => {
      if (res.statusCode !== 200) {
        clearTimeout(timeout);
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        clearTimeout(timeout);
        resolve(Buffer.concat(chunks));
      });
    }).on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

// Seed chunk via WebTorrent
function seedChunk(filePath, filename, magnet) {
  return new Promise((resolve, reject) => {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      reject(new Error(`File not found: ${filePath}`));
      return;
    }
    
    // Create torrent from file
    state.wtClient.seed(filePath, { announce: config.trackers }, (torrent) => {
      state.activeTorrents.set(filename, torrent);
      state.stats.chunksSeeded++;
      
      const fileSize = fs.statSync(filePath).size;
      state.stats.totalBytesSeeded += fileSize;
      
      console.log(`   🌱 Seeding ${filename} (${torrent.numPeers} peers)`);
      
      torrent.on('error', (err) => {
        console.error(`   ❌ Torrent error for ${filename}:`, err.message);
      });
      
      resolve(torrent);
    });
  });
}

// Cleanup old chunks
function cleanupOldChunks() {
  if (state.cachedChunks.size <= config.maxCachedChunks) {
    return;
  }
  
  // Remove oldest chunks
  const chunksToRemove = state.cachedChunks.size - config.maxCachedChunks;
  const entries = Array.from(state.cachedChunks.entries());
  
  for (let i = 0; i < chunksToRemove; i++) {
    const [filename, filePath] = entries[i];
    
    // Stop seeding
    const torrent = state.activeTorrents.get(filename);
    if (torrent) {
      torrent.destroy();
      state.activeTorrents.delete(filename);
    }
    
    // Delete file
    try {
      fs.unlinkSync(filePath);
      state.cachedChunks.delete(filename);
      console.log(`   🗑️  Cleaned up: ${filename}`);
    } catch (err) {
      console.error(`   ❌ Failed to delete ${filename}:`, err.message);
    }
  }
}

// Periodic stats logging
setInterval(() => {
  if (state.stats.chunksSeeded > 0) {
    console.log('\n📊 Seeder Stats:');
    console.log(`   Chunks Seeded: ${state.stats.chunksSeeded}`);
    console.log(`   Chunks Downloaded: ${state.stats.chunksDownloaded}`);
    console.log(`   Active Peers: ${state.stats.activePeers}`);
    console.log(`   Total Bytes Seeded: ${(state.stats.totalBytesSeeded / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Active Torrents: ${state.activeTorrents.size}\n`);
  }
}, 60000);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down gracefully...');
  
  if (state.ws) {
    state.ws.close();
  }
  
  // Destroy all torrents
  state.activeTorrents.forEach((torrent, filename) => {
    console.log(`   🛑 Stopping seed for ${filename}`);
    torrent.destroy();
  });
  
  if (state.wtClient) {
    state.wtClient.destroy(() => {
      console.log('✅ Shutdown complete');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

// Start
connectSignaling();

