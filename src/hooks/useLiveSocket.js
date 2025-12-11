'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const WS_PATH = '/ws'

export function useLiveSocket({ roomId, user, handlers = {} }) {
	const socketRef = useRef(null)
	const handlersRef = useRef(handlers)
	const [connectionState, setConnectionState] = useState('connecting')
	const [clientId, setClientId] = useState(null)
	const [participants, setParticipants] = useState([])
	const [chatMessages, setChatMessages] = useState([])
	const [studentEditingAllowed, setStudentEditingAllowed] = useState(false)

	useEffect(() => {
		handlersRef.current = handlers
	}, [handlers])

	useEffect(() => {
		if (!roomId || !user) return

		const url = new URL(WS_PATH, window.location.href)
		url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
		url.searchParams.set('roomId', roomId)

		const ws = new WebSocket(url.toString())
		socketRef.current = ws
		setConnectionState('connecting')

		ws.onopen = () => {
			setConnectionState('connected')
			ws.send(
				JSON.stringify({
					type: 'join',
					user: {
						id: user?.id,
						name: user?.name,
						role: user?.role
					}
				})
			)
		}

		ws.onclose = () => {
			setConnectionState('closed')
		}

		ws.onerror = () => {
			setConnectionState('error')
		}

		ws.onmessage = (event) => {
			try {
				const message = JSON.parse(event.data)
				handleMessage(message)
			} catch {
				// ignore
			}
		}

		return () => {
			ws.close()
			socketRef.current = null
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [roomId, user?.id, user?.name, user?.role])

	const handleMessage = useCallback((message) => {
		switch (message.type) {
			case 'welcome': {
				setClientId(message.clientId)
				setParticipants(message.participants || [])
				setStudentEditingAllowed(!!message.boardPermission)
				handlersRef.current.onWelcome?.(message)
				break
			}
			case 'presence:join': {
				setParticipants((prev) => {
					const exists = prev.find((p) => p.id === message.participant.id)
					if (exists) return prev
					return [...prev, message.participant]
				})
				handlersRef.current.onParticipantJoin?.(message.participant)
				break
			}
			case 'presence:leave': {
				setParticipants((prev) => prev.filter((p) => p.id !== message.participantId))
				handlersRef.current.onParticipantLeave?.(message.participantId)
				break
			}
			case 'chat:message': {
				setChatMessages((prev) => [...prev, message])
				handlersRef.current.onChat?.(message)
				break
			}
			case 'board:op': {
				handlersRef.current.onBoardOp?.(message.op, message.authorId)
				break
			}
			case 'board:cursor': {
				handlersRef.current.onCursor?.(message)
				break
			}
			case 'board:permission': {
				setStudentEditingAllowed(!!message.allowed)
				handlersRef.current.onBoardPermission?.(message.allowed)
				break
			}
			case 'media:update': {
				setParticipants((prev) =>
					prev.map((p) =>
						p.id === message.participantId
							? { ...p, media: message.media }
							: p
					)
				)
				handlersRef.current.onMediaUpdate?.(message)
				break
			}
			case 'signal': {
				handlersRef.current.onSignal?.(message)
				break
			}
			case 'kicked': {
				setConnectionState('closed')
				socketRef.current?.close()
				handlersRef.current.onKicked?.()
				break
			}
			default:
				break
		}
	}, [])

	const send = useCallback((payload) => {
		if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
			socketRef.current.send(JSON.stringify(payload))
		}
	}, [])

	const sendBoardOp = useCallback(
		(op) => {
			send({ type: 'board:op', op })
		},
		[send]
	)

	const sendCursor = useCallback(
		(cursor) => {
			send({ type: 'board:cursor', cursor })
		},
		[send]
	)

	const sendChatMessage = useCallback(
		(text) => {
			if (!text) return
			send({ type: 'chat:message', text })
		},
		[send]
	)

	const sendSignal = useCallback(
		(targetId, data) => {
			if (!targetId || !data) return
			send({ type: 'signal', targetId, data })
		},
		[send]
	)

	const sendMediaState = useCallback(
		(media) => {
			send({ type: 'media:update', media })
		},
		[send]
	)

	const sendBoardPermission = useCallback(
		(allowed) => {
			const nextAllowed = !!allowed
			setStudentEditingAllowed(nextAllowed)
			send({ type: 'board:permission', allowed: nextAllowed })
		},
		[send]
	)

	return useMemo(
		() => ({
			clientId,
			connectionState,
			participants,
			chatMessages,
			studentEditingAllowed,
			sendBoardOp,
			sendCursor,
			sendChatMessage,
			sendSignal,
			sendMediaState,
			sendBoardPermission,
			sendKick: (targetId) => send({ type: 'kick', targetId })
		}),
		[
			chatMessages,
			clientId,
			connectionState,
			participants,
			studentEditingAllowed,
			sendBoardOp,
			sendChatMessage,
			sendCursor,
			sendMediaState,
			sendSignal,
			sendBoardPermission
		]
	)
}
