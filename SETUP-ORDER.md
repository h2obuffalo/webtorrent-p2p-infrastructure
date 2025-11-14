# Recommended Setup Order

## Why This Order?

The components have dependencies:
1. **Signaling Server** - Required by broadcaster and viewers (most critical)
2. **Tracker** - Needed for peer discovery (can use public trackers temporarily)
3. **STUN Server** - Needed for WebRTC (can use Google's public STUN temporarily)
4. **Seeder** - Depends on signaling server being up

## Setup Order

### 1. Signaling Server (START HERE) ⭐

**Why First:**
- Broadcaster **requires** it to announce chunks
- Viewers **require** it to receive chunk notifications
- Without it, P2P coordination doesn't work
- Everything else can wait

**Time:** ~10-15 minutes

**What You'll Get:**
- WebSocket URL (e.g., `wss://webtorrent-signaling-xxx.run.app`)
- This URL goes in broadcaster and viewer configs

**After Setup:**
- Test connectivity from your local machine
- Update broadcaster config with the URL
- System can work with HTTP fallback while you set up the rest

---

### 2. Tracker (Second Priority)

**Why Second:**
- Needed for peer discovery in WebTorrent
- System can use public trackers temporarily, but your own is better
- Improves P2P performance and reliability

**Time:** ~10 minutes

**What You'll Get:**
- Tracker URL (e.g., `wss://webtorrent-tracker-xxx.run.app/tracker`)
- Add this to tracker lists in broadcaster and viewer

**After Setup:**
- Update tracker URLs in configs
- P2P peer discovery will work better

---

### 3. STUN Server (Can Wait)

**Why Third:**
- Needed for WebRTC NAT traversal
- System can use Google's public STUN servers as fallback
- Less critical initially, but improves connection success rate

**Time:** ~15-20 minutes (VM setup takes longer)

**What You'll Get:**
- STUN server IP/URL (e.g., `stun.yourdomain.com:3478`)
- Better NAT traversal for WebRTC connections

**After Setup:**
- Update STUN configuration in viewer
- WebRTC connections will be more reliable

---

### 4. Seeder (Last)

**Why Last:**
- Depends on signaling server being up
- Helps P2P distribution but not required
- Can be set up after everything else is working

**Time:** ~5 minutes (just install and configure)

**What You'll Get:**
- On-site seeder helping distribute chunks
- Better P2P performance for viewers

**After Setup:**
- Seeder will automatically connect and start seeding
- Monitor logs to verify it's working

---

## Quick Start: Just Signaling Server

If you want to get started quickly, you can:

1. ✅ Set up **Signaling Server only**
2. ✅ Update broadcaster and viewer configs
3. ✅ Test the system (will use HTTP fallback + public trackers)
4. ⏭️ Set up tracker, STUN, and seeder later

The system will work with just the signaling server - you'll just use public trackers and Google's STUN servers until you set up your own.

