# Migration Guide

This guide explains how to migrate from the integrated setup to this separate repository.

## What Changed

The P2P infrastructure components have been moved to this separate repository:

- ✅ Signaling server (`signaling/`)
- ✅ WebTorrent tracker deployment configs
- ✅ STUN server deployment instructions
- ✅ On-site seeder service (`seeder/`)
- ✅ Google Cloud deployment configurations
- ✅ Documentation

## What Stays in Main Repo

The main `webtorrent-livestream` repository still contains:

- Broadcaster service
- Viewer application
- Flutter app
- Lineup API
- Event dashboard
- Other streaming components

## Migration Steps

### 1. Clone This Repository

```bash
git clone <this-repo-url>
cd webtorrent-p2p-infrastructure
```

### 2. Update Main Repo References

In the main `webtorrent-livestream` repository, update configuration files to point to this infrastructure:

**Broadcaster** (`.env`):
```bash
SIGNALING_URL=wss://your-signaling-url.run.app
TRACKER_URLS=wss://your-tracker-url.run.app/tracker,wss://tracker.openwebtorrent.com
```

**Viewer** (`viewer/src/player.js`):
```javascript
const CONFIG = {
  signalingUrl: 'wss://your-signaling-url.run.app',
  trackers: [
    'wss://your-tracker-url.run.app/tracker',
    // ...
  ],
};
```

### 3. Deploy Infrastructure

Follow `docs/GOOGLE-CLOUD-SETUP.md` to deploy all components.

### 4. Update Seeder

If you have an existing seeder, update it to use this repository:

```bash
cd seeder
npm install
cp .env.example .env
# Edit .env with your Google Cloud URLs
npm start
```

## Benefits of Separation

1. **Clearer Organization** - P2P infrastructure is separate from streaming logic
2. **Independent Deployment** - Deploy infrastructure updates without touching main repo
3. **Easier Maintenance** - Focused repository for infrastructure concerns
4. **Reusability** - Can be used with other WebTorrent projects

## Integration

The main repository still references this infrastructure via URLs. No code changes needed in the main repo - just configuration updates.

## Support

For issues with:
- **This infrastructure**: Open issues in this repository
- **Main streaming system**: Open issues in `webtorrent-livestream` repository

