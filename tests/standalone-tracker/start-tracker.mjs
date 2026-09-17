import http from 'node:http'
import { Server } from 'bittorrent-tracker'

const trackerPort = Number(process.env.TRACKER_PORT || 8000)
const healthPort = Number(process.env.HEALTH_PORT || 8001)

const tracker = new Server({
  udp: false,
  http: true,
  ws: true,
  stats: true
})

tracker.on('error', error => console.error(JSON.stringify({ event: 'tracker-error', message: error.message })))
tracker.on('warning', warning => console.warn(JSON.stringify({ event: 'tracker-warning', message: warning.message })))
tracker.on('start', (peerId, params) => console.log(JSON.stringify({ event: 'announce-start', peerId, infoHash: params.info_hash })))
tracker.on('complete', (peerId, params) => console.log(JSON.stringify({ event: 'announce-complete', peerId, infoHash: params.info_hash })))
tracker.on('update', (peerId, params) => console.log(JSON.stringify({ event: 'announce-update', peerId, infoHash: params.info_hash })))
tracker.on('stop', (peerId, params) => console.log(JSON.stringify({ event: 'announce-stop', peerId, infoHash: params.info_hash })))

tracker.listen(trackerPort, '127.0.0.1', () => {
  console.log(JSON.stringify({
    event: 'tracker-listening',
    trackerUrl: `ws://127.0.0.1:${trackerPort}/announce`,
    protocol: 'WebTorrent tracker over WebSocket',
    dependency: 'bittorrent-tracker@11.2.2'
  }))
})

const healthServer = http.createServer((request, response) => {
  if (request.url === '/' || request.url === '/health') {
    response.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
    response.end(JSON.stringify({ status: 'healthy', service: 'webtorrent-tracker-test', trackerPort }))
    return
  }
  response.writeHead(404)
  response.end('Not found')
})

healthServer.listen(healthPort, '127.0.0.1', () => {
  console.log(JSON.stringify({ event: 'health-listening', url: `http://127.0.0.1:${healthPort}/health` }))
})

const shutdown = () => {
  healthServer.close()
  tracker.close(() => process.exit(0))
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
