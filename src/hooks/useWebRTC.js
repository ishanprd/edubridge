'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

const iceConfig = {
	iceServers: [
		{ urls: 'stun:stun.l.google.com:19302' },
		{ urls: 'stun:global.stun.twilio.com:3478' }
	]
}

export function useWebRTC({
	clientId,
	participants,
	sendSignal,
	onMediaStateChange
}) {
	const peersRef = useRef(new Map())
	const makingOfferRef = useRef(new Map())
	const remoteAnswerPendingRef = useRef(new Map())
	const politeRef = useRef(new Map())
	const [localStream, setLocalStream] = useState(null)
	const [localScreenStream, setLocalScreenStream] = useState(null)
	const [remoteStreams, setRemoteStreams] = useState({})
	const [mediaState, setMediaState] = useState({
		mic: false,
		cam: false,
		screen: false
	})
	const screenStreamRef = useRef(null)
	const screenTrackIdRef = useRef(null)
	const mediaStateRef = useRef(mediaState)

	const announceMedia = useCallback(
		(next) => {
			setMediaState((prev) => {
				const merged = { ...prev, ...next }
				onMediaStateChange?.(merged)
				mediaStateRef.current = merged
				return merged
			})
		},
		[onMediaStateChange]
	)

	const ensureLocalStream = useCallback(async () => {
		if (localStream) return localStream
		const stream = await navigator.mediaDevices.getUserMedia({
			video: true,
			audio: true
		})
		setLocalStream(stream)
		stream.getAudioTracks().forEach((track) => (track.enabled = mediaStateRef.current.mic))
		stream.getVideoTracks().forEach((track) => (track.enabled = mediaStateRef.current.cam))
		return stream
	}, [localStream])

	const addTracksToPeer = useCallback(
		(peer) => {
			const senders = peer.getSenders()

			const replaceOrAdd = (track, stream, preferVideoReplace = false) => {
				if (!track) return
				let sender = senders.find((s) => s.track && s.track.id === track.id)

				if (!sender && preferVideoReplace) {
					sender = senders.find((s) => s.track && s.track.kind === 'video')
					if (sender) {
						sender.replaceTrack(track)
						return
					}
				}

				if (!sender) {
					peer.addTrack(track, stream)
				}
			}

			if (localStream) {
				localStream.getTracks().forEach((track) => replaceOrAdd(track, localStream))
			}

			if (screenStreamRef.current) {
				screenStreamRef.current.getTracks().forEach((track) => replaceOrAdd(track, screenStreamRef.current, true))
			}
		},
		[localStream]
	)

	const createPeer = useCallback(
		(participantId) => {
			if (peersRef.current.has(participantId)) {
				return peersRef.current.get(participantId)
			}

			let peer
			try {
				peer = new RTCPeerConnection(iceConfig)
			} catch (err) {
				console.error('Failed to create RTCPeerConnection', err)
				return null
			}

			peer.onicecandidate = (event) => {
				if (event.candidate) {
					sendSignal(participantId, { candidate: event.candidate })
				}
			}

			peer.ontrack = (event) => {
				const [stream] = event.streams
				if (!stream) return
				setRemoteStreams((prev) => ({
					...prev,
					[participantId]: stream
				}))
			}

			peer.onconnectionstatechange = () => {
				if (peer.connectionState === 'failed' || peer.connectionState === 'closed') {
					peersRef.current.delete(participantId)
					makingOfferRef.current.delete(participantId)
					remoteAnswerPendingRef.current.delete(participantId)
					politeRef.current.delete(participantId)
					setRemoteStreams((prev) => {
						const next = { ...prev }
						delete next[participantId]
						return next
					})
				}
			}

			peer.onnegotiationneeded = async () => {
				if (peer.signalingState !== 'stable') return
				if (makingOfferRef.current.get(participantId)) return
				makingOfferRef.current.set(participantId, true)
				try {
					addTracksToPeer(peer)
					await peer.setLocalDescription(await peer.createOffer())
					sendSignal(participantId, { offer: peer.localDescription })
				} catch {
					// ignore negotiation errors to keep session alive
				} finally {
					makingOfferRef.current.set(participantId, false)
				}
			}

			peersRef.current.set(participantId, peer)
			addTracksToPeer(peer)
			return peer
		},
		[addTracksToPeer, sendSignal]
	)

	const makeOffer = useCallback(
		async (participantId) => {
			const peer = createPeer(participantId)
			if (!peer) return
			if (peer.signalingState !== 'stable') return
			if (makingOfferRef.current.get(participantId)) return
			makingOfferRef.current.set(participantId, true)
			addTracksToPeer(peer)
			try {
				await peer.setLocalDescription(await peer.createOffer())
				sendSignal(participantId, { offer: peer.localDescription })
			} catch {
				// ignore
			} finally {
				makingOfferRef.current.set(participantId, false)
			}
		},
		[addTracksToPeer, createPeer, sendSignal]
	)

	const renegotiateAll = useCallback(() => {
		if (!clientId) return
		const ids = participants.map((p) => p.id).filter((id) => id !== clientId)
		ids.forEach((id) => {
			makeOffer(id)
		})
	}, [clientId, makeOffer, participants])

	useEffect(() => {
		if (!clientId) return
		const ids = participants.map((p) => p.id).filter((id) => id !== clientId)
		ids.forEach((id) => {
			if (!peersRef.current.has(id)) {
				// Perfect-negotiation style: deterministic polite peer to avoid glare
				politeRef.current.set(id, clientId > id)
				makingOfferRef.current.set(id, false)
				remoteAnswerPendingRef.current.set(id, false)
				makeOffer(id)
			}
		})
	}, [clientId, makeOffer, participants])

	const handleSignal = useCallback(
		async (payload) => {
			const { from, data } = payload
			if (!from || !data) return
			const peer = createPeer(from)
			if (data.offer) {
				const polite = politeRef.current.get(from)
				const offerCollision = makingOfferRef.current.get(from) || peer.signalingState !== 'stable'
				if (offerCollision && !polite) {
					return
				}
				remoteAnswerPendingRef.current.set(from, peer.signalingState === 'have-local-offer')
				await peer.setRemoteDescription(new RTCSessionDescription(data.offer))
				addTracksToPeer(peer)
				const answer = await peer.createAnswer()
				await peer.setLocalDescription(answer)
				remoteAnswerPendingRef.current.set(from, false)
				sendSignal(from, { answer })
			} else if (data.answer) {
				remoteAnswerPendingRef.current.set(from, false)
				await peer.setRemoteDescription(new RTCSessionDescription(data.answer))
			} else if (data.candidate) {
				try {
					await peer.addIceCandidate(new RTCIceCandidate(data.candidate))
				} catch {
					// ignore bad candidate
				}
			}
		},
		[addTracksToPeer, createPeer, sendSignal]
	)

	const toggleMic = useCallback(async () => {
		const next = !mediaStateRef.current.mic
		try {
			const stream = await ensureLocalStream()
			stream.getAudioTracks().forEach((track) => {
				track.enabled = next
			})
			announceMedia({ mic: next })
		} catch (err) {
			console.error('Unable to toggle microphone', err)
		}
	}, [announceMedia, ensureLocalStream])

	const toggleCam = useCallback(async () => {
		const next = !mediaStateRef.current.cam
		try {
			const stream = await ensureLocalStream()
			stream.getVideoTracks().forEach((track) => {
				track.enabled = next
			})
			announceMedia({ cam: next })
		} catch (err) {
			console.error('Unable to toggle camera', err)
		}
	}, [announceMedia, ensureLocalStream])

	const addTracksToPeerForAll = useCallback(() => {
		for (const peer of peersRef.current.values()) {
			addTracksToPeer(peer)
		}
	}, [addTracksToPeer])

	const stopScreenShare = useCallback(() => {
		if (!screenStreamRef.current) return
		// Remove screen tracks from peers
		const screenTracks = screenStreamRef.current.getTracks()
		peersRef.current.forEach((peer) => {
			peer.getSenders().forEach((sender) => {
				if (sender.track && screenTracks.find((t) => t.id === sender.track.id)) {
					const camTrack = localStream?.getVideoTracks()?.[0] || null
					if (camTrack) {
						sender.replaceTrack(camTrack)
					} else {
						peer.removeTrack(sender)
					}
				}
			})
		})
		screenStreamRef.current.getTracks().forEach((t) => t.stop())
		screenStreamRef.current = null
		setLocalScreenStream(null)
		screenTrackIdRef.current = null
		addTracksToPeerForAll()
		renegotiateAll()
		announceMedia({ screen: false })
	}, [addTracksToPeerForAll, announceMedia, renegotiateAll, localStream])

	const startScreenShare = useCallback(async () => {
		if (screenStreamRef.current) return

		// Allow screen sharing even if mic/camera permissions are denied.
		let stream
		try {
			stream = await navigator.mediaDevices.getDisplayMedia({ video: true })
		} catch (err) {
			console.error('Unable to start screen share', err)
			return
		}

		screenStreamRef.current = stream
		const screenTrack = stream.getVideoTracks()[0]
		setLocalScreenStream(stream)
		screenTrackIdRef.current = screenTrack?.id || null
		stream.getVideoTracks().forEach((track) => {
			track.onended = () => {
				stopScreenShare()
			}
		})
		addTracksToPeerForAll()
		renegotiateAll()
		announceMedia({ screen: true })
	}, [addTracksToPeerForAll, announceMedia, renegotiateAll, stopScreenShare])

	const stopAll = useCallback(() => {
		localStream?.getTracks().forEach((t) => t.stop())
		screenStreamRef.current?.getTracks().forEach((t) => t.stop())
		setLocalScreenStream(null)
		peersRef.current.forEach((peer) => peer.close())
		peersRef.current.clear()
		makingOfferRef.current.clear()
		remoteAnswerPendingRef.current.clear()
		politeRef.current.clear()
		setRemoteStreams({})
	}, [localStream])

	useEffect(() => {
		if (!localStream) return
		addTracksToPeerForAll()
		renegotiateAll()
	}, [addTracksToPeerForAll, localStream, renegotiateAll])

	useEffect(() => {
		return () => {
			stopAll()
		}
	}, [stopAll])

	return {
		localStream,
		localScreenStream,
		remoteStreams,
		mediaState,
		toggleMic,
		toggleCam,
		startScreenShare,
		stopScreenShare,
		handleSignal,
		stopAll
	}
}
