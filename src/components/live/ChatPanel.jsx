'use client'

import { useEffect, useRef, useState } from 'react'
import { Send } from 'lucide-react'

export default function ChatPanel({ messages, onSend }) {
	const [text, setText] = useState('')
	const listRef = useRef(null)

	useEffect(() => {
		if (listRef.current) {
			listRef.current.scrollTop = listRef.current.scrollHeight
		}
	}, [messages])

	const submit = (e) => {
		e.preventDefault()
		if (!text.trim()) return
		onSend?.(text.trim())
		setText('')
	}

	return (
		<div className='flex flex-col h-full bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-inner'>
			<div className='px-4 py-3 border-b border-slate-200 flex items-center justify-between'>
				<div>
					<p className='text-sm font-semibold text-slate-900'>Live Chat</p>
					<p className='text-xs text-slate-500'>Share quick updates during class</p>
				</div>
			</div>
			<div ref={listRef} className='flex-1 overflow-y-auto px-4 py-3 space-y-3'>
				{messages.map((m) => (
					<div key={m.id} className='bg-slate-50 rounded-xl px-3 py-2 border border-slate-100'>
						<div className='flex items-center gap-2 text-xs text-slate-500'>
							<span className='font-semibold text-slate-900'>{m.name || 'Guest'}</span>
							<span className='px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700'>
								{m.role}
							</span>
							<span>{new Date(m.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
						</div>
						<p className='text-sm text-slate-900 mt-1'>{m.text}</p>
					</div>
				))}
				{!messages.length && (
					<div className='text-center text-slate-400 text-sm py-6'>
						No messages yet
					</div>
				)}
			</div>
			<form onSubmit={submit} className='p-3 border-t border-slate-200 bg-white'>
				<div className='flex items-center gap-2'>
					<input
						value={text}
						onChange={(e) => setText(e.target.value)}
						className='flex-1 border border-slate-200 rounded-full px-3 py-2 text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-200'
						placeholder='Type a message...'
					/>
					<button
						type='submit'
						className='inline-flex items-center gap-2 bg-sky-600 text-white px-3 py-2 rounded-full text-sm shadow hover:bg-sky-500 transition'
					>
						<Send size={16} />
						Send
					</button>
				</div>
			</form>
		</div>
	)
}
