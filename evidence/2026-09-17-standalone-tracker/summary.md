# Standalone P2P infrastructure verification — 2026-09-17

## Scope

This run was performed from the isolated branch
`p2p-infrastructure/standalone-tracker-test`, based on secured `main` at
`fe8c2ee`. The original dirty `webtorrent-p2p-infrastructure/main` checkout
was not modified. No livestream application, HLS viewer, P2P Media Loader,
custom application signaling server, historical server seeder, R2/CDN, or
authentication was started.

## Intended implementation established

The committed tracker implementation is the wrapper embedded in
`deploy/google-cloud/tracker-Dockerfile`: `bittorrent-tracker@11.2.2`, UDP
disabled, HTTP enabled, WebSocket enabled. Its test URL was
`ws://127.0.0.1:8000/announce`; health was served separately at
`http://127.0.0.1:8001/health`. The documented
`deploy/google-cloud/tracker-server.mjs` was absent from secured `main` and
exists only as an untracked reference in the original dirty checkout.

The existing infrastructure STUN deployment is coturn instructions only. The
standalone browser probe used the already documented public fallback
`stun:stun.l.google.com:19302`; no TURN or new infrastructure was introduced.

## Deterministic test

Both browser clients used info hash
`9a8097ef6e43369c9418c05ddadc0700b31ae8f6` and the same tracker URL. Browser A
seeded `standalone-p2p-test.bin` (77 bytes). Browser B joined by magnet, got
metadata from Browser A, and verified the bytes:

```text
sha256 = a162aaebe34550d34d2452f03aa2701922aa232d06ddb4a5c0fe525033401dd1
```

The expected hash is the same value captured in the browser run. The payload
was received over the WebRTC/WebTorrent peer wire; no server seeder or web
seed was available.

## Acceptance results

| Proof | Result | Evidence |
| --- | --- | --- |
| Browser A WebSocket handshake | PASS | `browser-a.jsonl` |
| Browser B WebSocket handshake | PASS | `browser-b.jsonl` |
| Both announce same swarm | PASS; same info hash in both browser events and tracker server log | `tracker-server.log`, `browser-*.jsonl` |
| Peer discovery | PASS; each side reports the other WebRTC peer ID | `browser-*.jsonl` |
| ICE negotiation | PASS; connected/completed gathering | `browser-*.jsonl` |
| RTCDataChannel | PASS; open on both sides | `browser-*.jsonl` |
| Browser A → B bytes | PASS; 77 bytes and matching SHA-256 | `browser-b.jsonl` |
| Native `getStats()` | PASS; non-zero data-channel stats on both sides | `browser-*.jsonl` |
| STUN independence | PASS; tracker-free probe gathered `host` and `srflx` | `stun.json` |

The selected pair in the transfer was `host`/`host` with `state=succeeded` and
`nominated=true` on both sides. The browser returned blank address fields for
the selected pair (privacy/mDNS behaviour), so this run proves a host/LAN
selected path, not a server-reflexive selected path. The tracker-free probe
also observed `srflx`, proving STUN candidate gathering occurred.

The non-zero final DataChannel stats were:

- Browser A: `bytesSent=387`, `bytesReceived=187`, `messagesSent=10`,
  `messagesReceived=10`.
- Browser B: `bytesSent=187`, `bytesReceived=387`, `messagesSent=10`,
  `messagesReceived=10`.

## Fixes and failures

The first experimental run found a test-only instrumentation error: the
`torrent.wire` object is not the native peer connection; the peer owns the
`RTCPeerConnection` while the wire is the BitTorrent protocol layer. The
harness was minimally corrected to associate each wire with its owning peer
and to wait for non-zero native stats before declaring success. No production
code was changed. The clean rerun passed.

The WebSocket observer was also moved before the pinned WebTorrent bundle,
and an explicit independent WebSocket handshake probe was added. These are
test-only changes. The successful WebTorrent `trackerAnnounce` events and
server-side announce records remain separate from the raw handshake proof.

## Deferred work

This establishes only the standalone infrastructure control. It does not
select a canonical viewer, does not test HLS or P2P Media Loader, and does not
validate custom signaling, server seeding, CDN fallback, retention, or
authentication.
