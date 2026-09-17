# Standalone tracker/WebRTC verification

This test is isolated from `webtorrent-livestream`. It starts only the
committed `bittorrent-tracker` server wrapper and a static browser page. It
does not start `webtorrent-livestream/signaling/server.js`, the historical
server seeder, R2/CDN, authentication, or any streaming viewer.

The browser test uses the existing seeder dependency's pinned `WebTorrent
1.9.7` browser bundle. Browser A seeds a deterministic 77-byte payload and
Browser B downloads it from the same deterministic info hash. DHT, LSD, and
web seeds are disabled. The tracker is the committed Dockerfile
implementation's `bittorrent-tracker@11.2.2` server with UDP disabled and HTTP
and WebSocket enabled.

From this worktree, after installing the existing dependencies locally:

```bash
node tests/standalone-tracker/start-tracker.mjs
python3 -m http.server 5174 --bind 127.0.0.1
```

Open the client page in two browser tabs:

```text
http://127.0.0.1:5174/tests/standalone-tracker/client.html?role=A&tracker=ws%3A%2F%2F127.0.0.1%3A8000%2Fannounce
http://127.0.0.1:5174/tests/standalone-tracker/client.html?role=B&tracker=ws%3A%2F%2F127.0.0.1%3A8000%2Fannounce
```

`stun.html` is a tracker-free ICE gathering probe. It uses the existing
documented public STUN fallback only to distinguish host and server-reflexive
candidate gathering; it does not add TURN or another service.
