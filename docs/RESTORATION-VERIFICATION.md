# P2P infrastructure restoration verification

This repository supplies independent infrastructure tests for the streaming
restoration. A WebTorrent tracker, STUN/TURN service, and the streaming
repository's custom application signaling server are separate components.

## Tracker

The tracker candidate is `deploy/google-cloud/tracker-server.mjs`. Its health
endpoint reports service identity and current swarm totals, but those totals
are diagnostics rather than evidence of segment transfer.

```bash
curl --fail --silent --show-error https://TRACKER_HOST/health | jq .
```

Record the response, deployment image digest, tracker WebSocket URL, and
timestamp. Independently test WebSocket announce/peer discovery with two
browser clients using the same swarm ID. Record announce responses and peer
IDs separately from media-loader events.

## STUN/TURN

Use the deployment instructions in `deploy/google-cloud/stun-deploy.yaml` and
record the exact ICE server configuration. In each browser capture ICE
candidate types and connection state. A successful tracker announcement is
not a successful ICE path, and an ICE connection is not proof that media bytes
were transferred.

## Custom signaling distinction

`webtorrent-livestream/signaling/server.js` is an application-level chunk and
magnet notification service. It is not this WebTorrent tracker. Start it only
for the manual WebTorrent/MSE comparison path that consumes its protocol.

The P2P Media Loader candidate must first be tested with the tracker/WebRTC
path and no server-side seeder. Preserve the current seeder and the historical
`broadcaster-seeder` implementation for later comparison; do not merge them
into the tracker baseline.
