# Contributing

This repository contains the P2P infrastructure components for WebTorrent live streaming.

## Development

### Signaling Server

```bash
cd signaling
npm install
npm start
```

### Seeder Service

```bash
cd seeder
npm install
cp .env.example .env
# Edit .env with your configuration
npm start
```

## Testing

Test each component individually before deploying:

1. **Signaling Server**: Test WebSocket connections
2. **Tracker**: Test tracker connectivity
3. **STUN Server**: Test NAT traversal
4. **Seeder**: Test chunk downloading and seeding

## Deployment

See `docs/GOOGLE-CLOUD-SETUP.md` for deployment instructions.

## Issues

Report issues in the GitHub issue tracker.

