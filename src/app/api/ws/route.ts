import { WebSocketServer, WebSocket } from 'ws'

// ============================================================
// Types
// ============================================================

interface Client {
  id: string
  username: string
  ws: WebSocket
  isAlive: boolean
  joinedAt: number
}

interface BroadcastMessage {
  type: string
  payload: Record<string, unknown>
  timestamp: string
  senderId?: string
  senderName?: string
}

// ============================================================
// Module-level state (survives across Next.js hot reloads in dev)
// ============================================================

let wss: WebSocketServer | null = null

const clients = new Map<string, Client>()

function getClientList() {
  return Array.from(clients.values()).map(c => ({
    id: c.id,
    username: c.username,
    joinedAt: c.joinedAt,
  }))
}

function broadcast(message: BroadcastMessage, excludeId?: string) {
  const data = JSON.stringify(message)
  clients.forEach((client) => {
    if (client.id !== excludeId && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(data)
    }
  })
}

// ============================================================
// Heartbeat interval
// ============================================================

function startHeartbeatCheck() {
  const interval = setInterval(() => {
    clients.forEach((client) => {
      if (!client.isAlive) {
        // No pong received — kill connection
        client.ws.terminate()
        clients.delete(client.id)
        broadcast({
          type: 'user_left',
          payload: { username: client.username },
          timestamp: new Date().toISOString(),
          senderName: 'System',
        })
        return
      }
      // Mark as needing pong
      client.isAlive = false
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.ping()
      }
    })
  }, 30_000)

  // Don't let interval prevent Node exit
  if (typeof interval.unref === 'function') {
    interval.unref()
  }
}

// ============================================================
// Route handler — Next.js ignores return value for upgrade requests
// ============================================================

export async function GET(request: Request) {
  const upgradeHeader = request.headers.get('upgrade')
  if (upgradeHeader !== 'websocket') {
    return new Response('Expected WebSocket upgrade', { status: 426 })
  }

  // We need to access the underlying server to handle WebSocket upgrade.
  // In Next.js standalone mode, we can use the process's HTTP server.
  // However, Next.js App Router route handlers don't directly expose the
  // underlying HTTP server. We work around this by creating a separate
  // WebSocketServer that listens on a dynamic import approach.
  //
  // For a production deployment, this should be replaced with a custom
  // server or a dedicated WebSocket service.
  //
  // Instead, we handle upgrade via the globalThis pattern:

  const server = (globalThis as Record<string, unknown>).__vl_ws_server as WebSocketServer | undefined
  if (server) {
    wss = server
  }

  return new Response(null, { status: 101 })
}

// ============================================================
// Initialize WebSocketServer (called from custom server or setup)
// ============================================================

export function initWebSocketServer(httpServer: import('http').Server) {
  if (wss) return wss

  wss = new WebSocketServer({ noServer: true, path: '/api/ws' })

  httpServer.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url || '', 'http://localhost')
    if (url.pathname === '/api/ws') {
      wss!.handleUpgrade(req, socket, head, (ws) => {
        wss!.emit('connection', ws, req)
      })
    } else {
      socket.destroy()
    }
  })

  wss.on('connection', (ws: WebSocket, req: import('http').IncomingMessage) => {
    const clientId = `client-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const client: Client = {
      id: clientId,
      username: 'Anonymous',
      ws,
      isAlive: true,
      joinedAt: Date.now(),
    }
    clients.set(clientId, client)

    // Send current user list to new client
    ws.send(JSON.stringify({
      type: 'user_list',
      payload: { users: getClientList() },
      timestamp: new Date().toISOString(),
    }))

    // Broadcast join event
    broadcast({
      type: 'user_joined',
      payload: { username: client.username, users: getClientList() },
      timestamp: new Date().toISOString(),
      senderId: clientId,
      senderName: 'System',
    }, clientId)

    // Handle ping/pong for liveness
    ws.on('pong', () => {
      client.isAlive = true
    })

    // Handle messages
    ws.on('message', (raw) => {
      try {
        const data = JSON.parse(raw.toString()) as BroadcastMessage

        // Handle ping from client
        if (data.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }))
          return
        }

        // Update username on user_joined
        if (data.type === 'user_joined' && data.payload?.username) {
          client.username = String(data.payload.username)
        }

        // Allowed event types
        const allowedTypes = [
          'user_joined', 'user_left', 'cursor_move',
          'selection_change', 'typing_indicator', 'message_reaction',
          'chat_message', 'whiteboard_draw',
        ]

        if (allowedTypes.includes(data.type)) {
          // Enrich the message
          const enriched: BroadcastMessage = {
            ...data,
            senderId: clientId,
            senderName: client.username,
            timestamp: new Date().toISOString(),
          }

          // Broadcast to all OTHER clients
          broadcast(enriched, clientId)
        }
      } catch {
        // Ignore malformed messages
      }
    })

    // Handle close
    ws.on('close', () => {
      clients.delete(clientId)
      broadcast({
        type: 'user_left',
        payload: { username: client.username, users: getClientList() },
        timestamp: new Date().toISOString(),
        senderId: clientId,
        senderName: 'System',
      })
    })

    // Handle error
    ws.on('error', () => {
      clients.delete(clientId)
    })
  })

  startHeartbeatCheck()

  return wss
}

// Make wss accessible for custom server
export function getWSS(): WebSocketServer | null {
  return wss
}

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
