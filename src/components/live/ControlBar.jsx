'use client'

import { Mic, MicOff, MonitorUp, PhoneOff, Video, VideoOff, PenSquare } from 'lucide-react'

export default function ControlBar({
	mediaState,
	onToggleMic,
	onToggleCam,
	onShareScreen,
	onOpenWhiteboard,
	onLeave
}) {
	const iconButton =
		'flex items-center justify-center w-12 h-12 rounded-full border border-slate-200 bg-white hover:bg-slate-50 transition text-slate-800 shadow-lg'

	return (
		<div className='flex items-center justify-center gap-3 bg-white/95 border border-slate-200 rounded-full px-4 py-3 shadow-2xl'>
			<button onClick={onToggleMic} className={`${iconButton} ${mediaState?.mic ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : ''}`}>
				{mediaState?.mic ? <Mic size={18} /> : <MicOff size={18} />}
			</button>
			<button onClick={onToggleCam} className={`${iconButton} ${mediaState?.cam ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : ''}`}>
				{mediaState?.cam ? <Video size={18} /> : <VideoOff size={18} />}
			</button>
			<button onClick={onShareScreen} className={`${iconButton} ${mediaState?.screen ? 'border-amber-500 bg-amber-50 text-amber-700' : ''}`}>
				<MonitorUp size={18} />
			</button>
			{onOpenWhiteboard && (
				<button onClick={onOpenWhiteboard} className={`${iconButton}`}>
					<PenSquare size={18} />
				</button>
			)}
			<button
				onClick={onLeave}
				className='flex items-center justify-center gap-2 px-5 h-12 rounded-full text-sm font-semibold bg-rose-600 text-white shadow-lg border border-rose-700 hover:bg-rose-500 transition'
			>
				<PhoneOff size={18} />
				<span>Leave</span>
			</button>
		</div>
	)
}
