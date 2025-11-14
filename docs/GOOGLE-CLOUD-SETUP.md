# Google Cloud P2P Infrastructure Setup Guide

This guide covers deploying the P2P infrastructure (signaling server, tracker, and STUN server) to Google Cloud to reduce load on EC2.

## Prerequisites

- Google Cloud account with billing enabled
- `gcloud` CLI installed and configured
- Docker installed (for building images)
- Domain name configured (optional, for custom domains)

## Architecture Overview

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

## 1. Signaling Server Deployment

### 1.1 Build Docker Image

```bash
cd deploy/google-cloud
docker build -f signaling-Dockerfile -t gcr.io/YOUR_PROJECT_ID/webtorrent-signaling:latest ../..
```

### 1.2 Push to Google Container Registry

```bash
gcloud auth configure-docker
docker push gcr.io/YOUR_PROJECT_ID/webtorrent-signaling:latest
```

### 1.3 Deploy to Cloud Run

```bash
gcloud run deploy webtorrent-signaling \
  --image gcr.io/YOUR_PROJECT_ID/webtorrent-signaling:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 2 \
  --min-instances 1 \
  --max-instances 10 \
  --set-env-vars "PORT=8080,ENABLE_DEBUG_LOGGING=false,ENABLE_HTTPS=false"
```

### 1.4 Get Signaling URL

```bash
gcloud run services describe webtorrent-signaling --region us-central1 --format="value(status.url)"
```

Update this URL in:
- `broadcaster-go/config/config.go` (SIGNALING_URL)
- `viewer/src/player.js` (signalingUrl)
- `seeder/seeder-service.js` (signalingUrl)
- `.env` files

## 2. WebTorrent Tracker Deployment

### 2.1 Build Docker Image

```bash
docker build -f tracker-Dockerfile -t gcr.io/YOUR_PROJECT_ID/webtorrent-tracker:latest .
```

### 2.2 Push to Google Container Registry

```bash
docker push gcr.io/YOUR_PROJECT_ID/webtorrent-tracker:latest
```

### 2.3 Deploy to Cloud Run

```bash
gcloud run deploy webtorrent-tracker \
  --image gcr.io/YOUR_PROJECT_ID/webtorrent-tracker:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8000 \
  --memory 512Mi \
  --cpu 2 \
  --min-instances 1 \
  --max-instances 20
```

### 2.4 Get Tracker URL

```bash
TRACKER_URL=$(gcloud run services describe webtorrent-tracker --region us-central1 --format="value(status.url)")
echo "Tracker URL: wss://${TRACKER_URL#https://}/tracker"
```

Add this URL to tracker lists in:
- `broadcaster-go/config/config.go` (TRACKER_URLS)
- `viewer/src/player.js` (trackers array)
- `seeder/seeder-service.js` (trackers array)

## 3. STUN Server Deployment

### 3.1 Create VM Instance

```bash
gcloud compute instances create webtorrent-stun \
  --machine-type=e2-small \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --tags=stun-server \
  --zone=us-central1-a
```

### 3.2 Install coturn

SSH into the instance:

```bash
gcloud compute ssh webtorrent-stun --zone=us-central1-a
```

Then run:

```bash
sudo apt-get update
sudo apt-get install -y coturn

# Get external IP
EXTERNAL_IP=$(curl -s https://api.ipify.org)

# Configure coturn
sudo tee /etc/turnserver.conf > /dev/null <<EOF
listening-port=3478
listening-ip=0.0.0.0
external-ip=${EXTERNAL_IP}
realm=webtorrent
server-name=webtorrent-stun
user-quota=12
total-quota=1200
no-stdout-log
log-file=/var/log/turnserver.log
verbose
EOF

# Enable and start coturn
sudo systemctl enable coturn
sudo systemctl start coturn
```

### 3.3 Create Firewall Rule

```bash
gcloud compute firewall-rules create allow-stun-turn \
  --allow udp:3478,tcp:3478,udp:49152-65535 \
  --source-ranges 0.0.0.0/0 \
  --target-tags stun-server \
  --description "Allow STUN/TURN traffic"
```

### 3.4 Get STUN Server IP

```bash
gcloud compute instances describe webtorrent-stun \
  --zone=us-central1-a \
  --format="get(networkInterfaces[0].accessConfigs[0].natIP)"
```

Use this IP in:
- `viewer/src/device-detection.js` (getSTUNServers function)
- Viewer configuration

## 4. On-Site Seeder Setup

### 4.1 Install Dependencies

On the old laptop:

```bash
cd seeder
npm install
```

### 4.2 Configure Environment

Create `.env` file:

```bash
SIGNALING_URL=wss://your-signaling-url.run.app
TRACKER_URLS=wss://your-tracker-url.run.app/tracker,wss://tracker.openwebtorrent.com
CHUNK_CACHE_DIR=./chunks
MAX_CACHED_CHUNKS=20
DOWNLOAD_TIMEOUT=10000
ENABLE_DEBUG_LOGGING=false
```

### 4.3 Run Seeder

```bash
npm start
```

### 4.4 Auto-start on Boot (Linux)

Create systemd service:

```bash
sudo tee /etc/systemd/system/webtorrent-seeder.service > /dev/null <<EOF
[Unit]
Description=WebTorrent Seeder Service
After=network.target

[Service]
Type=simple
User=YOUR_USER
WorkingDirectory=/path/to/webtorrent-livestream/seeder
ExecStart=/usr/bin/node seeder-service.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable webtorrent-seeder
sudo systemctl start webtorrent-seeder
```

## 5. Update Configuration Files

### 5.1 Broadcaster

Update `.env` or environment variables:

```bash
SIGNALING_URL=wss://your-signaling-url.run.app
TRACKER_URLS=wss://your-tracker-url.run.app/tracker,wss://tracker.openwebtorrent.com
```

### 5.2 Viewer

Update `viewer/src/player.js`:

```javascript
const CONFIG = {
  signalingUrl: 'wss://your-signaling-url.run.app',
  trackers: [
    'wss://your-tracker-url.run.app/tracker',
    'wss://tracker.openwebtorrent.com',
    // ... other trackers
  ],
};
```

### 5.3 Flutter App

Update `flutter_viewer/lib/config/constants.dart`:

```dart
static const String signalingUrl = 'wss://your-signaling-url.run.app';
```

## 6. Testing

### 6.1 Test Signaling Server

```bash
curl https://your-signaling-url.run.app/health
```

### 6.2 Test Tracker

```bash
curl https://your-tracker-url.run.app/health
```

### 6.3 Test STUN Server

Use WebRTC test tool: https://test.webrtc.org/

### 6.4 Test Seeder

Check seeder logs:

```bash
tail -f seeder/logs/seeder.log
```

## 7. Monitoring

### 7.1 Cloud Run Logs

```bash
gcloud run services logs read webtorrent-signaling --region us-central1
gcloud run services logs read webtorrent-tracker --region us-central1
```

### 7.2 Compute Engine Logs

```bash
gcloud compute instances get-serial-port-output webtorrent-stun --zone=us-central1-a
```

## 8. Cost Estimation

- **Cloud Run**: ~$0.40 per million requests (first 2M free)
- **Compute Engine (e2-small)**: ~$6/month
- **Total**: ~$6-10/month for typical usage

## 9. Troubleshooting

### Signaling server not connecting

- Check Cloud Run service is running
- Verify URL is correct (wss:// not ws://)
- Check firewall rules

### Tracker not working

- Verify tracker URL format (wss://)
- Check Cloud Run logs for errors
- Test with WebTorrent client

### STUN server issues

- Verify firewall rules allow UDP 3478
- Check coturn is running: `sudo systemctl status coturn`
- Test with WebRTC test tool

### Seeder not seeding

- Check signaling connection
- Verify chunk downloads are working
- Check WebTorrent client is initialized
- Review seeder logs

## 10. Security Considerations

- Use Cloud Load Balancer with SSL for production
- Restrict STUN server access if needed
- Monitor Cloud Run costs
- Set up alerts for service failures

