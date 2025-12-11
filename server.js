const http = require('http')
const next = require('next')
const crypto = require('crypto')

const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })
const handle = app.getRequestHandler()

const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'
const rooms = new Map()

function getRoom(roomId) {
	if (!rooms.has(roomId)) {
		rooms.set(roomId, { clients: new Map(), boardPermission: false })
	}
	return rooms.get(roomId)
}

function acceptWebSocket(req, socket) {
	const key = req.headers['sec-websocket-key']
	if (!key) {
		socket.destroy()
		return
	}

	const acceptKey = crypto
		.createHash('sha1')
		.update(key + WS_GUID)
		.digest('base64')

	const responseHeaders = [
		'HTTP/1.1 101 Switching Protocols',
		'Upgrade: websocket',
		'Connection: Upgrade',
		`Sec-WebSocket-Accept: ${acceptKey}`,
		'\r\n'
	]

	socket.write(responseHeaders.join('\r\n'))

	const roomId = (() => {
		try {
			const url = new URL(req.url, `http://${req.headers.host}`)
			return url.searchParams.get('roomId') || 'default'
		} catch {
			return 'default'
		}
	})()

	const clientId = crypto.randomUUID()
	const room = getRoom(roomId)
	const client = {
		id: clientId,
		roomId,
		socket,
		buffer: Buffer.alloc(0),
		user: null
	}
	room.clients.set(clientId, client)

	socket.on('data', (chunk) => handleData(client, chunk))
	socket.on('close', () => cleanupClient(client))
	socket.on('error', () => cleanupClient(client))
}

function handleData(client, chunk) {
	client.buffer = Buffer.concat([client.buffer, chunk])

	while (true) {
		const frame = parseFrame(client.buffer)
		if (!frame) break

		client.buffer = client.buffer.slice(frame.length)

		if (frame.opcode === 0x8) {
			// close
			client.socket.end()
			return
		}

		if (frame.opcode === 0x9) {
			// ping -> pong
			client.socket.write(encodeFrame(frame.payload, 0xA))
			continue
		}

		if (frame.opcode !== 0x1) continue // only text frames

		try {
			const message = JSON.parse(frame.payload.toString('utf8'))
			handleMessage(client, message)
		} catch {
			// ignore malformed payloads
		}
	}
}

function handleMessage(client, message) {
	const room = rooms.get(client.roomId)
	if (!room) return

	switch (message.type) {
		case 'join': {
			client.user = {
				id: message.user?.id || client.id,
				name: message.user?.name || 'Guest',
				role: message.user?.role || 'student'
			}

			const participants = []
			for (const [id, c] of room.clients.entries()) {
				if (!c.user) continue
				participants.push({
					id,
					name: c.user.name,
					role: c.user.role,
					media: c.media || { mic: false, cam: false, screen: false }
				})
			}

			sendToClient(client, {
				type: 'welcome',
				clientId: client.id,
				participants,
				boardPermission: room.boardPermission || false
			})

			broadcastToRoom(client.roomId, {
				type: 'presence:join',
				participant: {
					id: client.id,
					name: client.user.name,
					role: client.user.role,
					media: client.media || { mic: false, cam: false, screen: false }
				}
			}, client.id)
			break
		}

		case 'kick': {
			if (!client.user || client.user.role !== 'teacher') break
			const targetId = message.targetId
			if (!targetId) break
			const target = room.clients.get(targetId)
			if (!target) break
			sendToClient(target, { type: 'kicked' })
			target.socket.end()
			break
		}

		case 'chat:message': {
			const payload = {
				type: 'chat:message',
				id: crypto.randomUUID(),
				userId: client.user?.id || client.id,
				name: client.user?.name || 'Guest',
				role: client.user?.role || 'student',
				text: message.text || '',
				timestamp: Date.now()
			}
			broadcastToRoom(client.roomId, payload)
			break
		}

		case 'board:op': {
			if (!message.op) return
			broadcastToRoom(client.roomId, {
				type: 'board:op',
				op: message.op,
				authorId: client.user?.id || client.id
			}, client.id)
			break
		}

		case 'board:cursor': {
			if (!message.cursor) return
			broadcastToRoom(client.roomId, {
				type: 'board:cursor',
				cursor: message.cursor,
				authorId: client.user?.id || client.id,
				name: client.user?.name || 'Guest'
			}, client.id)
			break
		}

		case 'board:permission': {
			if (!client.user || client.user.role !== 'teacher') break
			const allowed = !!message.allowed
			room.boardPermission = allowed
			broadcastToRoom(client.roomId, {
				type: 'board:permission',
				allowed,
				authorId: client.user?.id || client.id
			})
			break
		}

		case 'media:update': {
			client.media = message.media
				? {
					mic: !!message.media.mic,
					cam: !!message.media.cam,
					screen: !!message.media.screen
				}
				: { mic: false, cam: false, screen: false }

			broadcastToRoom(client.roomId, {
				type: 'media:update',
				participantId: client.id,
				media: client.media
			}, client.id)
			break
		}

		case 'signal': {
			if (!message.targetId || !message.data) return
			sendToClientId(client.roomId, message.targetId, {
				type: 'signal',
				from: client.id,
				data: message.data
			})
			break
		}

		default:
			break
	}
}

function cleanupClient(client) {
	const room = rooms.get(client.roomId)
	if (!room) return

	room.clients.delete(client.id)

	if (client.user) {
		broadcastToRoom(client.roomId, {
			type: 'presence:leave',
			participantId: client.id
		})
	}

	if (room.clients.size === 0) {
		rooms.delete(client.roomId)
	}
}

function broadcastToRoom(roomId, data, excludeId = null) {
	const room = rooms.get(roomId)
	if (!room) return
	for (const [id, client] of room.clients.entries()) {
		if (excludeId && id === excludeId) continue
		sendToClient(client, data)
	}
}

function sendToClientId(roomId, targetId, data) {
	const room = rooms.get(roomId)
	if (!room) return
	const client = room.clients.get(targetId)
	if (client) sendToClient(client, data)
}

function sendToClient(client, data) {
	if (!client.socket.writable) return
	const payload = Buffer.from(JSON.stringify(data))
	const frame = encodeFrame(payload)
	client.socket.write(frame)
}

function parseFrame(buffer) {
	if (buffer.length < 2) return null

	const firstByte = buffer[0]
	const secondByte = buffer[1]
	const isMasked = (secondByte & 0x80) === 0x80
	let payloadLength = secondByte & 0x7f
	let offset = 2

	if (payloadLength === 126) {
		if (buffer.length < 4) return null
		payloadLength = buffer.readUInt16BE(2)
		offset = 4
	} else if (payloadLength === 127) {
		if (buffer.length < 10) return null
		const high = buffer.readUInt32BE(2)
		const low = buffer.readUInt32BE(6)
		payloadLength = high * 2 ** 32 + low
		offset = 10
	}

	const maskLength = isMasked ? 4 : 0
	const totalLength = offset + maskLength + payloadLength
	if (buffer.length < totalLength) return null

	let maskingKey = null
	if (isMasked) {
		maskingKey = buffer.slice(offset, offset + 4)
		offset += 4
	}

	const payload = buffer.slice(offset, offset + payloadLength)
	const data = isMasked ? unmask(payload, maskingKey) : payload

	return {
		opcode: firstByte & 0x0f,
		payload: data,
		length: totalLength
	}
}

function unmask(payload, key) {
	const result = Buffer.alloc(payload.length)
	for (let i = 0; i < payload.length; i++) {
		result[i] = payload[i] ^ key[i % 4]
	}
	return result
}

function encodeFrame(payload, opcode = 0x1) {
	const length = payload.length
	let headerLength = 2
	if (length >= 126 && length < 65536) headerLength += 2
	else if (length >= 65536) headerLength += 8

	const frame = Buffer.alloc(headerLength + length)

	frame[0] = 0x80 | (opcode & 0x0f)

	if (length < 126) {
		frame[1] = length
		payload.copy(frame, 2)
	} else if (length < 65536) {
		frame[1] = 126
		frame.writeUInt16BE(length, 2)
		payload.copy(frame, 4)
	} else {
		frame[1] = 127
		frame.writeBigUInt64BE(BigInt(length), 2)
		payload.copy(frame, 10)
	}

	return frame
}

app.prepare().then(() => {
	const server = http.createServer((req, res) => {
		handle(req, res)
	})

	const upgradeHandler = typeof app.getUpgradeHandler === 'function' ? app.getUpgradeHandler() : null

	server.on('upgrade', (req, socket, head) => {
		if (req.headers.upgrade?.toLowerCase() !== 'websocket') {
			socket.destroy()
			return
		}

		let pathname = ''
		try {
			const url = new URL(req.url, `http://${req.headers.host}`)
			pathname = url.pathname
		} catch {
			// fallback: if we can't parse, let Next handle it
		}

		if (pathname === '/ws') {
			acceptWebSocket(req, socket, head)
		} else {
			// Let Next.js handle other websocket upgrades (HMR, middleware)
			if (upgradeHandler) {
				upgradeHandler(req, socket, head)
			} else {
				socket.destroy()
			}
		}
	})

	const port = parseInt(process.env.PORT || '3000', 10)
	server.listen(port, () => {
		console.log(`Ready on http://localhost:${port}`)
	})
}).catch((err) => {
	console.error(err)
	process.exit(1)
})
