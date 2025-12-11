'use client'

import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { useRouter } from 'next/navigation'
import { handleAxiosError } from '@/lib/utils/clientFunctions'
import { ArrowLeft, Loader2, Signal } from 'lucide-react'
import Whiteboard from './Whiteboard'
import ChatPanel from './ChatPanel'
import ParticipantList from './ParticipantList'
import MediaGrid from './MediaGrid'
import ControlBar from './ControlBar'
import { useLiveSocket } from '@/hooks/useLiveSocket'
import { useWebRTC } from '@/hooks/useWebRTC'

export default function LiveSessionShell({ roomId, backHref }) {
	const router = useRouter()
	const [user, setUser] = useState(null)
	const [loadingUser, setLoadingUser] = useState(true)
	const [userError, setUserError] = useState('')
	const [kicked, setKicked] = useState(false)
	const whiteboardRef = useRef(null)
	const signalHandlerRef = useRef(null)
	const [whiteboardOpen, setWhiteboardOpen] = useState(false)
	const [sidePanelTab, setSidePanelTab] = useState('people')

	useEffect(() => {
		const getMe = async () => {
			try {
				const res = await axios.get('/api/auth/me', { withCredentials: true })
				const data = res.data?.data?.user
				setUser({
					id: data?._id || data?.id,
					name: data?.firstName || data?.name || 'Guest',
					role: data?.role || 'student'
				})
			} catch (err) {
				setUserError('Unable to load your profile')
				handleAxiosError(err)
			} finally {
				setLoadingUser(false)
			}
		}
		getMe()
	}, [])

	const {
		clientId,
		connectionState,
		participants,
		chatMessages,
		sendBoardOp,
		sendCursor,
		sendChatMessage,
		sendSignal,
		sendMediaState,
		sendBoardPermission,
		sendKick,
		studentEditingAllowed
	} = useLiveSocket({
		roomId,
		user,
		handlers: {
			onBoardOp: (op) => {
				whiteboardRef.current?.applyRemoteOp(op)
				whiteboardRef.current?.redraw?.()
			},
			onCursor: (msg) => whiteboardRef.current?.updateCursor(msg),
			onSignal: (msg) => signalHandlerRef.current?.(msg),
			onKicked: () => {
				setKicked(true)
				stopAll()
			},
			onBoardPermission: () => whiteboardRef.current?.redraw?.()
		}
	})

	const {
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
	} = useWebRTC({
		clientId,
		participants,
		sendSignal,
		onMediaStateChange: sendMediaState
	})

	useEffect(() => {
		signalHandlerRef.current = handleSignal
	}, [handleSignal])

	const participantList = (() => {
		if (!clientId || !user) return participants
		const me = { id: clientId, name: user.name, role: user.role, media: mediaState }
		const others = participants.filter((p) => p.id !== clientId)
		return [...others, me]
	})()

	const isReadOnly = user?.role === 'student' && !studentEditingAllowed

	const handleShareScreen = () => {
		if (mediaState.screen) {
			stopScreenShare()
		} else {
			startScreenShare()
		}
	}

	const handleLeave = () => {
		stopAll()
		router.push(backHref || '/')
	}

	const handleKick = (participantId) => {
		if (!participantId || user?.role !== 'teacher') return
		sendKick?.(participantId)
	}

	useEffect(() => {
		if (whiteboardOpen) {
			setTimeout(() => {
				whiteboardRef.current?.redraw?.()
			}, 50)
		}
	}, [whiteboardOpen])

	const toggleWhiteboard = () => setWhiteboardOpen((s) => !s)

	const toggleStudentEditing = () => {
		if (user?.role !== 'teacher') return
		sendBoardPermission?.(!studentEditingAllowed)
	}

	const handleClearBoard = () => {
		if (isReadOnly) return
		whiteboardRef.current?.clearBoard?.()
	}

	if (loadingUser) {
		return (
			<div className='w-screen h-screen flex items-center justify-center'>
				<Loader2 size={28} className='animate-spin text-sky-600' />
			</div>
		)
	}

	if (userError) {
		return (
			<div className='w-screen h-screen flex flex-col items-center justify-center gap-3'>
				<p className='text-gray-800 font-semibold'>{userError}</p>
				<button
					onClick={() => router.push('/')}
					className='px-4 py-2 bg-sky-600 text-white rounded-lg shadow'
				>
					Back to dashboard
				</button>
			</div>
		)
	}

	if (kicked) {
		return (
			<div className='fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50'>
				<div className='bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center space-y-4'>
					<p className='text-xl font-semibold text-slate-900'>You were removed</p>
					<p className='text-sm text-slate-600'>The teacher removed you from this live session.</p>
					<button
						onClick={handleLeave}
						className='w-full px-4 py-2 rounded-full bg-slate-900 text-white font-semibold hover:bg-slate-800 transition'
					>
						Exit session
					</button>
				</div>
			</div>
		)
	}

	return (
		<div className='min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 text-slate-900 p-4 md:p-6 pb-12'>
			<div className='max-w-7xl mx-auto flex flex-col gap-4'>
				<header className='flex items-center justify-between bg-white/90 backdrop-blur border border-slate-200 rounded-2xl px-4 md:px-6 py-3 shadow-md'>
					<div className='flex items-center gap-3'>
						<button
							onClick={() => router.push(backHref || '/')}
							className='inline-flex items-center gap-2 px-3 py-2 rounded-full border border-slate-200 bg-white hover:bg-slate-50 transition text-sm font-semibold text-slate-800'
						>
							<ArrowLeft size={18} />
							<span>Back</span>
						</button>
						<div>
							<p className='text-base font-semibold text-slate-900'>Live Classroom</p>
							<p className='text-xs text-slate-500'>Room: {roomId}</p>
						</div>
					</div>
					<div className='flex items-center gap-3'>
						<div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium border ${
							connectionState === 'connected'
								? 'bg-emerald-50 text-emerald-700 border-emerald-200'
								: connectionState === 'connecting'
									? 'bg-amber-50 text-amber-700 border-amber-200'
									: 'bg-rose-50 text-rose-700 border-rose-200'
						}`}>
							<Signal size={14} />
							<span className='capitalize'>{connectionState}</span>
						</div>
						<div className='text-sm text-slate-700 flex items-center gap-2'>
							<span className='font-semibold'>{user?.name}</span>
							<span className='text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200'>
								{user?.role}
							</span>
						</div>
					</div>
				</header>

				<div className='grid grid-cols-1 lg:grid-cols-[320px,1fr] gap-4 flex-1 min-h-0'>
					<aside className='bg-white border border-slate-200 rounded-2xl p-3 flex flex-col min-h-0 shadow-lg'>
						<div className='flex gap-2 mb-3'>
							<button
								className={`flex-1 rounded-full px-3 py-2 text-sm font-semibold border ${sidePanelTab === 'people' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-200 text-slate-700'}`}
								onClick={() => setSidePanelTab('people')}
							>
								People
							</button>
							<button
								className={`flex-1 rounded-full px-3 py-2 text-sm font-semibold border ${sidePanelTab === 'chat' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-200 text-slate-700'}`}
								onClick={() => setSidePanelTab('chat')}
							>
								Chat
							</button>
						</div>
						<div className='flex-1 min-h-0'>
							{sidePanelTab === 'chat' ? (
								<ChatPanel messages={chatMessages} onSend={sendChatMessage} />
							) : (
								<ParticipantList
									participants={participantList}
									clientId={clientId}
									onKick={user?.role === 'teacher' ? handleKick : undefined}
								/>
							)}
						</div>
					</aside>

					<section className='bg-white border border-slate-200 rounded-2xl p-4 flex flex-col gap-4 min-h-0 shadow-lg'>
						<div className='flex items-center justify-between'>
							<div className='flex items-center gap-3 text-sm text-slate-600'>
								<div className='h-2 w-2 rounded-full bg-emerald-500 animate-pulse' />
								<span>{participantList.length} in room</span>
							</div>
							<button
								onClick={toggleWhiteboard}
								className='px-3 py-2 rounded-full bg-slate-100 border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition'
							>
								Open Whiteboard
							</button>
						</div>

						<div className='flex-1 min-h-0'>
							<MediaGrid
								localStream={localStream}
								localScreenStream={localScreenStream}
								remoteStreams={remoteStreams}
								participants={participantList}
								clientId={clientId}
							/>
						</div>
					</section>
				</div>

				<div className='flex items-center justify-center mt-4 sticky bottom-4 z-30'>
					<ControlBar
						mediaState={mediaState}
						onToggleMic={toggleMic}
						onToggleCam={toggleCam}
						onShareScreen={handleShareScreen}
						onOpenWhiteboard={toggleWhiteboard}
						onLeave={handleLeave}
					/>
				</div>
			</div>

			<div className={`${whiteboardOpen ? 'flex' : 'hidden'} fixed inset-0 z-50 bg-black/50 backdrop-blur-sm items-center justify-center p-4`}>
				<div className='relative w-full max-w-6xl h-[80vh] bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col'>
					<div className='flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50'>
						<div>
							<p className='text-sm font-semibold text-slate-900'>Whiteboard</p>
							<p className='text-xs text-slate-500'>Collaborate in real time</p>
						</div>
						<div className='flex items-center gap-3'>
							{user?.role === 'teacher' && (
								<div className='flex items-center gap-2 bg-white border border-slate-200 rounded-full px-3 py-2 shadow-sm'>
									<span className='text-xs font-semibold text-slate-700'>Student editing</span>
									<button
										type='button'
										role='switch'
										aria-checked={studentEditingAllowed}
										onClick={toggleStudentEditing}
										className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
											studentEditingAllowed ? 'bg-emerald-500' : 'bg-slate-300'
										}`}
									>
										<span
											className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
												studentEditingAllowed ? 'translate-x-5' : 'translate-x-1'
											}`}
										/>
									</button>
									<span className='text-xs text-slate-500'>
										{studentEditingAllowed ? 'Can edit' : 'View only'}
									</span>
								</div>
							)}
							<button
								onClick={handleClearBoard}
								disabled={isReadOnly}
								className={`px-3 py-2 rounded-full text-sm font-semibold transition ${
									isReadOnly
										? 'bg-slate-100 text-slate-400 cursor-not-allowed'
										: 'bg-slate-200 text-slate-800 hover:bg-slate-300'
								}`}
							>
								Clear
							</button>
							<button
								onClick={toggleWhiteboard}
								className='px-3 py-2 rounded-full bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition'
							>
								Hide
							</button>
						</div>
					</div>
					<div className='flex-1 min-h-0 p-4 bg-white'>
						<Whiteboard
							ref={whiteboardRef}
							isReadOnly={isReadOnly}
							sendBoardOp={sendBoardOp}
							sendCursor={sendCursor}
							userName={user?.name}
							clientId={clientId}
						/>
					</div>
				</div>
			</div>
		</div>
	)
}
