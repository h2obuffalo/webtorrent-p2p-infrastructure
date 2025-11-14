# Quick Start: Signaling Server Setup

This is the fastest way to get started. We'll set up just the signaling server first, which is all you need to get the system working.

## Prerequisites Check

```bash
# Check if you have gcloud CLI
gcloud --version

# Check if you have Docker
docker --version

# Check if you're logged into Google Cloud
gcloud auth list
```

If any are missing:
- **gcloud**: `brew install google-cloud-sdk` (macOS) or see https://cloud.google.com/sdk/docs/install
- **Docker**: Install Docker Desktop
- **Login**: `gcloud auth login` and `gcloud auth application-default login`

## Step 1: Set Your Project ID

```bash
export PROJECT_ID=your-google-cloud-project-id
gcloud config set project $PROJECT_ID
```

## Step 2: Enable Required APIs

```bash
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
```

## Step 3: Build Signaling Server Image

```bash
cd ../webtorrent-p2p-infrastructure
docker build -f deploy/google-cloud/signaling-Dockerfile -t gcr.io/$PROJECT_ID/webtorrent-signaling:latest .
```

## Step 4: Push to Google Container Registry

```bash
gcloud auth configure-docker
docker push gcr.io/$PROJECT_ID/webtorrent-signaling:latest
```

## Step 5: Deploy to Cloud Run

```bash
gcloud run deploy webtorrent-signaling \
  --image gcr.io/$PROJECT_ID/webtorrent-signaling:latest \
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

## Step 6: Get Your Signaling URL

```bash
SIGNALING_URL=$(gcloud run services describe webtorrent-signaling \
  --region us-central1 \
  --format="value(status.url)")

echo "Your signaling URL: $SIGNALING_URL"
echo "WebSocket URL: ${SIGNALING_URL/https:\/\//wss:\/\/}"
```

## Step 7: Test It

```bash
# Test health endpoint
curl ${SIGNALING_URL}/health

# Should return JSON with status: "healthy"
```

## Step 8: Update Your Configs

Update these files in your main `webtorrent-livestream` repo:

**Broadcaster** (`.env` or environment):
```bash
SIGNALING_URL=wss://your-signaling-url.run.app
```

**Viewer** (`viewer/src/player.js`):
```javascript
const CONFIG = {
  signalingUrl: 'wss://your-signaling-url.run.app',
  // ...
};
```

**Flutter App** (`flutter_viewer/lib/config/constants.dart`):
```dart
static const String signalingUrl = 'wss://your-signaling-url.run.app';
```

## You're Done! 🎉

Your signaling server is now running on Google Cloud. The system will work with:
- ✅ Your signaling server (Google Cloud)
- ✅ Public trackers (temporary, until you set up your own)
- ✅ Google's STUN servers (temporary, until you set up your own)

You can set up the tracker and STUN server later when you're ready.

## Next Steps

1. Test the broadcaster connecting to signaling
2. Test viewers connecting to signaling
3. When ready, set up the tracker (see `docs/GOOGLE-CLOUD-SETUP.md` section 2)
4. When ready, set up the STUN server (see `docs/GOOGLE-CLOUD-SETUP.md` section 3)
