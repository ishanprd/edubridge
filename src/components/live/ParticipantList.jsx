'use client'

import { Laptop, Mic, MicOff, MonitorUp, Video, VideoOff } from 'lucide-react'

export default function ParticipantList({ participants, clientId, onKick }) {
	return (
		<div className='h-full bg-white border border-slate-200 rounded-2xl shadow-inner overflow-hidden'>
			<div className='px-4 py-3 border-b border-slate-200'>
				<p className='text-sm font-semibold text-slate-900'>Participants</p>
				<p className='text-xs text-slate-500'>{participants.length} in room</p>
			</div>
			<div className='divide-y divide-slate-100 max-h-[400px] overflow-y-auto'>
				{participants.map((p) => (
					<div key={p.id} className='px-4 py-3 flex items-center justify-between'>
						<div>
							<div className='flex items-center gap-2 text-sm font-semibold text-slate-900'>
								<span>{p.name || 'Guest'}</span>
								{p.id === clientId && (
									<span className='text-[11px] px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-100'>
										You
									</span>
								)}
								<span className='text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200'>
									{p.role}
								</span>
							</div>
							<div className='flex items-center gap-2 text-xs text-slate-500 mt-1'>
								<Laptop size={12} />
								<span>Online</span>
							</div>
						</div>
						<div className='flex items-center gap-2 text-slate-500'>
							{p.media?.screen ? (
								<MonitorUp size={16} className='text-emerald-600' />
							) : null}
							{p.media?.cam ? (
								<Video size={16} className='text-emerald-600' />
							) : (
								<VideoOff size={16} className='text-slate-400' />
							)}
							{p.media?.mic ? (
								<Mic size={16} className='text-emerald-600' />
							) : (
								<MicOff size={16} className='text-slate-400' />
							)}
							{onKick && p.id !== clientId && (
								<button
									onClick={() => onKick(p.id)}
									className='text-xs px-2 py-1 rounded border border-rose-200 text-rose-600 hover:bg-rose-50 transition'
								>
									Remove
								</button>
							)}
						</div>
					</div>
				))}
				{!participants.length && (
					<div className='px-4 py-6 text-center text-slate-500 text-sm'>No one here yet</div>
				)}
			</div>
		</div>
	)
}
