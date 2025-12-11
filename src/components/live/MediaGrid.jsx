'use client'

import { useEffect, useRef } from 'react'
import { User } from 'lucide-react'

function initials(name) {
	if (!name) return '?'
	const parts = String(name).trim().split(/\s+/)
	return parts.slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || '?'
}

function VideoTile({ stream, label, muted, className = '', style }) {
	const videoRef = useRef(null)

	useEffect(() => {
		if (videoRef.current && stream) {
			videoRef.current.srcObject = stream
		}
	}, [stream])

	return (
		<div
			className={`relative bg-slate-50 rounded-2xl border border-slate-200 shadow-sm aspect-video flex items-center justify-center overflow-hidden ${className}`}
			style={style}
		>
			<video
				ref={videoRef}
				className='absolute inset-0 w-full h-full object-cover'
				autoPlay
				playsInline
				muted={muted}
			/>
			<div className='absolute bottom-3 left-3 bg-black/60 text-white text-xs px-3 py-1 rounded-full backdrop-blur'>
				{label}
			</div>
		</div>
	)
}

function PlaceholderTile({ name, className = '', style }) {
	return (
		<div
			className={`relative bg-slate-50 rounded-2xl border border-slate-200 shadow-sm aspect-video flex items-center justify-center ${className}`}
			style={style}
		>
			<div className='flex flex-col items-center gap-2'>
				<div className='w-14 h-14 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-lg font-semibold'>
					<User className='w-6 h-6' />
				</div>
				<p className='text-sm font-semibold text-slate-700'>{name || 'Guest'}</p>
			</div>
		</div>
	)
}

export default function MediaGrid({ localStream, localScreenStream, remoteStreams, participants, clientId }) {
	const screenSharer = participants.find((p) => p.media?.screen)
	const screenStream = screenSharer
		? screenSharer.id === clientId
			? localScreenStream || localStream
			: remoteStreams?.[screenSharer.id]
		: null

	const tiles = participants
		.filter((p) => !screenSharer || p.id !== screenSharer.id)
		.map((p) => {
			const isMe = p.id === clientId
			const stream = isMe ? localStream : remoteStreams?.[p.id]
			return {
				key: p.id,
				name: p.name || `Guest ${p.id?.slice(0, 4)}`,
				stream,
				muted: isMe
			}
		})

	return (
		<div className='flex flex-col gap-4 h-full'>
			{screenSharer && (
				<div className='flex justify-center'>
					{screenStream ? (
						<VideoTile
							stream={screenStream}
							label={`${screenSharer.name || 'Guest'} (Screen)`}
							muted={screenSharer.id === clientId}
							className='w-full max-w-5xl border-2 border-slate-300'
							style={{ aspectRatio: '4 / 3' }}
						/>
					) : (
						<PlaceholderTile
							name={`${screenSharer.name || 'Guest'} (Screen)`}
							className='w-full max-w-5xl border-2 border-slate-300'
							style={{ aspectRatio: '4 / 3' }}
						/>
					)}
				</div>
			)}

			<div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 h-full'>
				{tiles.map((tile) =>
					tile.stream ? (
						<VideoTile key={tile.key} stream={tile.stream} label={tile.name} muted={tile.muted} />
					) : (
						<PlaceholderTile key={tile.key} name={tile.name} />
					)
				)}
				{!tiles.length && !screenSharer && (
					<div className='col-span-full h-full min-h-[240px] flex items-center justify-center text-slate-500 bg-white border border-dashed border-slate-200 rounded-2xl'>
						No video streams yet
					</div>
				)}
			</div>
		</div>
	)
}
