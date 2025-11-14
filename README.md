# WebTorrent P2P Infrastructure

Google Cloud-based P2P infrastructure for WebTorrent live streaming. This repository contains the signaling server, tracker, STUN server, and on-site seeder service.

## Overview

This infrastructure moves P2P components (signaling, tracker, STUN) to Google Cloud to reduce load on the main streaming server (EC2). It includes:

- **Signaling Server** - WebSocket server for coordinating P2P connections
- **WebTorrent Tracker** - Tracker for peer discovery
- **STUN Server** - NAT traversal server for WebRTC
- **On-Site Seeder** - Service to seed chunks from a local machine

## Architecture

```
┌─────────────────┐
│   EC2 Instance  │
│  (Broadcaster)  │
└────────┬────────┘
         │
         ├─────────────────┐
         │                 │
         ▼                 ▼
┌─────────────────┐  ┌─────────────────┐
│ Google Cloud    │  │ Google Cloud    │
│ Signaling       │  │ Tracker         │
│ (Cloud Run)     │  │ (Cloud Run)     │
└─────────────────┘  └─────────────────┘
         │                 │
         └────────┬────────┘
                  │
                  ▼
         ┌─────────────────┐
         │ Google Cloud    │
         │ STUN Server     │
         │ (Compute Engine)│
         └─────────────────┘
```

## Quick Start

### 1. Prerequisites

- Google Cloud account with billing enabled
- `gcloud` CLI installed and configured
- Docker installed
- Node.js 20+ installed

### 2. Deploy Signaling Server

```bash
# Set your project ID
export PROJECT_ID=your-project-id

# Build and push image
docker build -f deploy/google-cloud/signaling-Dockerfile -t gcr.io/$PROJECT_ID/webtorrent-signaling:latest .
docker push gcr.io/$PROJECT_ID/webtorrent-signaling:latest

# Deploy to Cloud Run
gcloud run deploy webtorrent-signaling \
  --image gcr.io/$PROJECT_ID/webtorrent-signaling:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080
```

### 3. Deploy Tracker

```bash
# Build and push image
docker build -f deploy/google-cloud/tracker-Dockerfile -t gcr.io/$PROJECT_ID/webtorrent-tracker:latest .
docker push gcr.io/$PROJECT_ID/webtorrent-tracker:latest

# Deploy to Cloud Run
gcloud run deploy webtorrent-tracker \
  --image gcr.io/$PROJECT_ID/webtorrent-tracker:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8000
```

### 4. Deploy STUN Server

See `deploy/google-cloud/stun-deploy.yaml` for instructions.

### 5. Set Up On-Site Seeder

```bash
cd seeder
npm install
cp .env.example .env
# Edit .env with your Google Cloud URLs
npm start
```

## Documentation

- [Complete Setup Guide](docs/GOOGLE-CLOUD-SETUP.md) - Detailed deployment instructions
- [Implementation Summary](docs/IMPLEMENTATION-SUMMARY.md) - What was implemented and how

## Directory Structure

```
.
├── deploy/
│   └── google-cloud/      # Google Cloud deployment configs
├── seeder/                 # On-site seeder service
├── signaling/              # Signaling server code
├── docs/                   # Documentation
└── README.md              # This file
```

## Configuration

All services use environment variables for configuration. See individual service directories for details:

- `signaling/` - Signaling server configuration
- `seeder/` - Seeder service configuration

## Cost Estimation

- **Cloud Run**: ~$0.40 per million requests (first 2M free)
- **Compute Engine (e2-small)**: ~$6/month
- **Total**: ~$6-10/month for typical usage

## License

MIT

