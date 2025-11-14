# Google Cloud Deployment Files

This directory contains deployment configurations for Google Cloud infrastructure.

## Files

- `signaling-deploy.yaml` - Cloud Run deployment config for signaling server
- `signaling-Dockerfile` - Dockerfile for building signaling server image
- `tracker-deploy.yaml` - Cloud Run deployment config for WebTorrent tracker
- `tracker-Dockerfile` - Dockerfile for building tracker image
- `stun-deploy.yaml` - Instructions for deploying STUN server on Compute Engine

## Quick Start

1. **Set your Google Cloud project ID:**
   ```bash
   export PROJECT_ID=your-project-id
   ```

2. **Build and push signaling server:**
   ```bash
   docker build -f signaling-Dockerfile -t gcr.io/$PROJECT_ID/webtorrent-signaling:latest ../..
   docker push gcr.io/$PROJECT_ID/webtorrent-signaling:latest
   ```

3. **Deploy signaling server:**
   ```bash
   gcloud run deploy webtorrent-signaling \
     --image gcr.io/$PROJECT_ID/webtorrent-signaling:latest \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --port 8080
   ```

4. **Get the URL:**
   ```bash
   gcloud run services describe webtorrent-signaling --region us-central1 --format="value(status.url)"
   ```

See `docs/GOOGLE-CLOUD-SETUP.md` for complete setup instructions.

