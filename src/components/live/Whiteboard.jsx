'use client'

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { Eraser, Paintbrush, Square, Undo2, Redo2, Trash2, Type } from 'lucide-react'

const uid = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`)

const COLORS = ['#0ea5e9', '#f97316', '#22c55e', '#6366f1', '#ef4444', '#111827']

function ToolButton({ active, icon: Icon, label, onClick, disabled }) {
	return (
		<button
			onClick={onClick}
			disabled={disabled}
			className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition ${
				active
					? 'bg-sky-50 border-sky-200 text-sky-700'
					: 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
			} ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
		>
			<Icon size={16} />
			<span>{label}</span>
		</button>
	)
}

function drawShape(ctx, shape) {
	if (!shape) return
	ctx.strokeStyle = shape.color || '#111827'
	ctx.fillStyle = shape.color || '#111827'
	ctx.lineWidth = shape.size || 2
	ctx.lineCap = 'round'
	ctx.lineJoin = 'round'

	if (shape.type === 'pen') {
		const pts = shape.points || []
		if (pts.length < 2) return
		ctx.beginPath()
		ctx.moveTo(pts[0].x, pts[0].y)
		for (let i = 1; i < pts.length; i++) {
			ctx.lineTo(pts[i].x, pts[i].y)
		}
		ctx.stroke()
	} else if (shape.type === 'rect') {
		const { x, y, w, h } = shape
		ctx.strokeRect(x, y, w, h)
	} else if (shape.type === 'text') {
		const style = shape.fontStyle || 'normal'
		ctx.font = `${style} ${shape.size || 16}px sans-serif`
		ctx.fillStyle = shape.color || '#111827'
		ctx.fillText(shape.text || '', shape.x, shape.y)
	}
}

function useResizeCanvas(canvasRef) {
	useEffect(() => {
		const canvas = canvasRef.current
		if (!canvas) return
		const resize = () => {
			const rect = canvas.parentElement.getBoundingClientRect()
			canvas.width = rect.width * devicePixelRatio
			canvas.height = rect.height * devicePixelRatio
			canvas.style.width = `${rect.width}px`
			canvas.style.height = `${rect.height}px`
			const ctx = canvas.getContext('2d')
			ctx.scale(devicePixelRatio, devicePixelRatio)
		}
		resize()
		const observer = new ResizeObserver(resize)
		observer.observe(canvas.parentElement)
		return () => observer.disconnect()
	}, [canvasRef])
}

const Whiteboard = forwardRef(function Whiteboard(
	{
		isReadOnly,
		userName,
		sendBoardOp,
		sendCursor,
		clientId
	},
	ref
) {
	const canvasRef = useRef(null)
	const [tool, setTool] = useState('pen')
	const [strokeColor, setStrokeColor] = useState(COLORS[0])
	const [strokeWidth, setStrokeWidth] = useState(3)
	const [fontSize, setFontSize] = useState(16)
	const [fontStyle, setFontStyle] = useState('normal')
	const [addingText, setAddingText] = useState(false)
	const [textValue, setTextValue] = useState('')
	const [textPos, setTextPos] = useState(null)
	const [editingTextId, setEditingTextId] = useState(null)
	const [textBox, setTextBox] = useState(null)
	const [shapes, setShapes] = useState([])
	const [redoStack, setRedoStack] = useState([])
	const shapesRef = useRef([])
	const draftRef = useRef(null)
	const cursorRef = useRef({})
	const remoteDraftsRef = useRef({})
	const lastDraftSentRef = useRef(0)
	const textStartRef = useRef(null)

	useResizeCanvas(canvasRef)

	useImperativeHandle(ref, () => ({
		applyRemoteOp: (op) => applyRemoteOp(op),
		updateCursor: ({ cursor, authorId, name }) => {
			if (!cursor || !authorId) return
			cursorRef.current = {
				...cursorRef.current,
				[authorId]: { ...cursor, name }
			}
			requestAnimationFrame(draw)
		},
		clearBoard,
		redraw: () => requestAnimationFrame(draw)
	}))

	const draw = () => {
		const canvas = canvasRef.current
		if (!canvas) return
		const ctx = canvas.getContext('2d')
		const rect = canvas.getBoundingClientRect()
		ctx.clearRect(0, 0, rect.width, rect.height)
		shapesRef.current.forEach((shape) => drawShape(ctx, shape))
		if (draftRef.current) drawShape(ctx, draftRef.current)
		Object.values(remoteDraftsRef.current).forEach((shape) => drawShape(ctx, shape))

		// remote cursors
		Object.entries(cursorRef.current).forEach(([id, cursor]) => {
			if (!cursor) return
			ctx.fillStyle = cursor.color || '#0ea5e9'
			ctx.beginPath()
			ctx.arc(cursor.x, cursor.y, 4, 0, Math.PI * 2)
			ctx.fill()
			if (cursor.name) {
				ctx.font = '12px sans-serif'
				ctx.fillText(cursor.name, cursor.x + 8, cursor.y + 4)
			}
		})
	}

	useEffect(() => {
		draw()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [shapes, strokeColor, strokeWidth])

	const applyRemoteOp = (op) => {
		if (!op) return
		if (op.action === 'draftStart' && op.shape?.id) {
			remoteDraftsRef.current[op.shape.id] = { ...op.shape, points: op.shape.points ? [...op.shape.points] : [] }
			requestAnimationFrame(draw)
		} else if (op.action === 'draftAppend' && op.shapeId && op.point) {
			const current = remoteDraftsRef.current[op.shapeId] || { id: op.shapeId, type: 'pen', points: [] }
			current.points = [...(current.points || []), op.point]
			remoteDraftsRef.current[op.shapeId] = current
			requestAnimationFrame(draw)
		} else if (op.action === 'draftRect' && op.shape?.id) {
			remoteDraftsRef.current[op.shape.id] = { ...op.shape }
			requestAnimationFrame(draw)
		} else if (op.action === 'add' && op.shape) {
			if (op.shape.id && remoteDraftsRef.current[op.shape.id]) {
				delete remoteDraftsRef.current[op.shape.id]
			}
			shapesRef.current = [...shapesRef.current, op.shape]
			setShapes(shapesRef.current)
			requestAnimationFrame(draw)
		} else if (op.action === 'delete') {
			if (op.shapeId && remoteDraftsRef.current[op.shapeId]) {
				delete remoteDraftsRef.current[op.shapeId]
			}
			shapesRef.current = shapesRef.current.filter((s) => s.id !== op.shapeId)
			setShapes(shapesRef.current)
			requestAnimationFrame(draw)
		} else if (op.action === 'clear') {
			shapesRef.current = []
			setShapes([])
			remoteDraftsRef.current = {}
			requestAnimationFrame(draw)
		} else if (op.action === 'updateText' && op.shapeId && op.shape) {
			shapesRef.current = shapesRef.current.map((s) => (s.id === op.shapeId ? { ...s, ...op.shape } : s))
			setShapes(shapesRef.current)
			requestAnimationFrame(draw)
		}
	}

const sendOp = (op) => {
	sendBoardOp?.(op)
}

const measureTextBox = (ctx, shape) => {
	if (!ctx || !shape?.text) return null
	const style = shape.fontStyle || 'normal'
	const size = shape.size || 16
	ctx.font = `${style} ${size}px sans-serif`
	const width = ctx.measureText(shape.text).width
	const height = size * 1.2
	return {
		width,
		height,
		left: shape.x,
		top: shape.y - height,
		right: shape.x + width,
		bottom: shape.y + height * 0.2
	}
}

const handlePointerDown = (e) => {
	if (isReadOnly) return
	const canvas = canvasRef.current
	const rect = canvas.getBoundingClientRect()
	const x = e.clientX - rect.left
	const y = e.clientY - rect.top
	lastDraftSentRef.current = 0

	if (tool === 'pen') {
		draftRef.current = {
			id: uid(),
			type: 'pen',
			points: [{ x, y }],
			color: strokeColor,
			size: strokeWidth
		}
		sendOp({ action: 'draftStart', shape: draftRef.current })
	} else if (tool === 'rect') {
		draftRef.current = {
			id: uid(),
			type: 'rect',
			x,
			y,
			w: 0,
			h: 0,
			color: strokeColor,
			size: strokeWidth
		}
		sendOp({ action: 'draftRect', shape: draftRef.current })
	} else if (tool === 'eraser') {
		if (!shapesRef.current.length) return
		const next = shapesRef.current.slice(0, -1)
		const removed = shapesRef.current[shapesRef.current.length - 1]
		if (removed) sendOp({ action: 'delete', shapeId: removed.id })
		shapesRef.current = next
		setShapes(next)
		return
	} else if (tool === 'text') {
		const ctx = canvas.getContext('2d')
		const hit = shapes.find((s) => {
			if (s.type !== 'text') return false
			const box = measureTextBox(ctx, s)
			if (!box) return false
			return x >= box.left && x <= box.right && y >= box.top && y <= box.bottom
		})
		if (hit) {
			setTextValue(hit.text || '')
			setTextPos({ x: hit.x, y: hit.y })
			setEditingTextId(hit.id)
			setTextBox(null)
			textStartRef.current = null
			setAddingText(true)
		} else {
			textStartRef.current = { x, y }
			setTextBox({ x, y, w: 0, h: 0 })
			setEditingTextId(null)
			setTextValue('')
			document.addEventListener('pointermove', handlePointerMove)
			document.addEventListener('pointerup', handlePointerUp)
		}
		return
	}

	document.addEventListener('pointermove', handlePointerMove)
	document.addEventListener('pointerup', handlePointerUp)
}

const handlePointerMove = (e) => {
		const canvas = canvasRef.current
		if (!canvas) return
		const rect = canvas.getBoundingClientRect()
		const x = e.clientX - rect.left
		const y = e.clientY - rect.top

	sendCursor?.({
		x,
		y,
		color: strokeColor,
		name: userName,
		clientId
	})

	if (tool === 'text' && textStartRef.current) {
		setTextBox({
			x: textStartRef.current.x,
			y: textStartRef.current.y,
			w: x - textStartRef.current.x,
			h: y - textStartRef.current.y
		})
		return
	}

	if (isReadOnly) return

	if (!draftRef.current) return

	if (draftRef.current.type === 'pen') {
		draftRef.current.points.push({ x, y })
		if (shouldSendDraft()) {
			sendOp({ action: 'draftAppend', shapeId: draftRef.current.id, point: { x, y } })
		}
	} else if (draftRef.current.type === 'rect') {
			draftRef.current.w = x - draftRef.current.x
			draftRef.current.h = y - draftRef.current.y
			if (shouldSendDraft()) {
				sendOp({ action: 'draftRect', shape: draftRef.current })
			}
		}

		requestAnimationFrame(draw)
	}

	const handlePointerUp = () => {
		document.removeEventListener('pointermove', handlePointerMove)
		document.removeEventListener('pointerup', handlePointerUp)

	if (tool === 'text' && textStartRef.current) {
			const box = textBox || { x: textStartRef.current.x, y: textStartRef.current.y, w: 0, h: 0 }
			setTextPos({ x: box.x, y: box.y + Math.max(box.h, 20) })
			setAddingText(true)
			textStartRef.current = null
			return
		}

	if (!draftRef.current) return

	const shape = draftRef.current
	draftRef.current = null
	if (shape.type === 'pen' && shape.points?.length) {
		const lastPoint = shape.points[shape.points.length - 1]
		if (lastPoint) {
			// ensure final point is broadcast so remote viewers see the completed stroke
			sendOp({ action: 'draftAppend', shapeId: shape.id, point: lastPoint })
		}
	} else if (shape.type === 'rect') {
		sendOp({ action: 'draftRect', shape })
	}
	shapesRef.current = [...shapesRef.current, shape]
	setShapes(shapesRef.current)
	setRedoStack([])
	sendOp({ action: 'add', shape })
}

	const undo = () => {
		if (!shapesRef.current.length) return
		const removed = shapesRef.current[shapesRef.current.length - 1]
		const next = shapesRef.current.slice(0, -1)
		shapesRef.current = next
		setShapes(next)
		setRedoStack((r) => [...r, removed])
		sendOp({ action: 'delete', shapeId: removed?.id })
	}

	const redo = () => {
		setRedoStack((prev) => {
			if (!prev.length) return prev
			const restored = prev[prev.length - 1]
			shapesRef.current = [...shapesRef.current, restored]
			setShapes(shapesRef.current)
			sendOp({ action: 'add', shape: restored })
			return prev.slice(0, -1)
		})
	}

	const clearBoard = () => {
		shapesRef.current = []
		setShapes([])
		setRedoStack([])
		remoteDraftsRef.current = {}
		requestAnimationFrame(draw)
		sendOp({ action: 'clear' })
	}

	const shouldSendDraft = () => {
		const now = Date.now()
		if (now - lastDraftSentRef.current < 8) return false
		lastDraftSentRef.current = now
		return true
	}

	const toolButtons = useMemo(
		() => [
			{ id: 'pen', label: 'Pen', icon: Paintbrush },
			{ id: 'rect', label: 'Rectangle', icon: Square },
			{ id: 'eraser', label: 'Erase', icon: Eraser },
			{ id: 'text', label: 'Text', icon: Type }
		],
		[]
	)

	return (
		<div className='relative h-full w-full bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden shadow-sm'>
			<div className='absolute top-4 left-4 z-10 flex gap-2'>
				{toolButtons.map((t) => (
					<ToolButton
						key={t.id}
						icon={t.icon}
						label={t.label}
						active={tool === t.id}
						onClick={() => setTool(t.id)}
						disabled={isReadOnly}
					/>
				))}
			</div>

			<div className='absolute top-4 right-4 z-10 flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow'>
				<div className='flex items-center gap-2'>
					{COLORS.map((c) => (
						<button
							key={c}
							onClick={() => setStrokeColor(c)}
							className={`w-7 h-7 rounded-full border-2 ${strokeColor === c ? 'border-gray-900' : 'border-white'}`}
							style={{ backgroundColor: c }}
							disabled={isReadOnly}
						/>
					))}
				</div>
				<div className='flex items-center gap-2 pl-3 border-l border-gray-200'>
					<span className='text-xs text-gray-500'>Size</span>
					<input
						type='range'
						min={1}
						max={12}
						value={strokeWidth}
						disabled={isReadOnly}
						onChange={(e) => setStrokeWidth(Number(e.target.value))}
					/>
					{tool === 'text' && (
						<div className='flex items-center gap-2 ml-4'>
							<label className='text-xs text-gray-500'>Font</label>
							<select
								value={fontStyle}
								onChange={(e) => setFontStyle(e.target.value)}
								className='border border-gray-200 rounded px-2 py-1 text-xs'
								disabled={isReadOnly}
							>
								<option value='normal'>Regular</option>
								<option value='bold'>Bold</option>
								<option value='italic'>Italic</option>
							</select>
							<input
								type='number'
								min={10}
								max={48}
								value={fontSize}
								disabled={isReadOnly}
								onChange={(e) => setFontSize(Number(e.target.value) || 16)}
								className='w-16 border border-gray-200 rounded px-2 py-1 text-xs'
							/>
						</div>
					)}
				</div>
			</div>

			<div className='absolute bottom-4 left-4 z-10 flex gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow'>
				<ToolButton icon={Undo2} label='Undo' onClick={undo} disabled={isReadOnly || !shapes.length} />
				<ToolButton icon={Redo2} label='Redo' onClick={redo} disabled={isReadOnly || !redoStack.length} />
				<ToolButton icon={Trash2} label='Clear' onClick={clearBoard} disabled={isReadOnly} />
			</div>

			{textBox && tool === 'text' && (
				<div
					className='absolute border-2 border-dashed border-slate-400 bg-slate-200/20 pointer-events-none'
					style={{
						left: Math.min(textBox.x, textBox.x + textBox.w),
						top: Math.min(textBox.y, textBox.y + textBox.h),
						width: Math.abs(textBox.w || 1),
						height: Math.abs(textBox.h || 1)
					}}
				/>
			)}

			{addingText && textPos && (
				<div className='absolute inset-0 z-20 flex items-center justify-center bg-black/30 backdrop-blur-sm'>
					<div className='bg-white rounded-xl shadow p-4 w-full max-w-md space-y-3'>
						<p className='text-sm font-semibold text-slate-900'>Add text</p>
							<textarea
								value={textValue}
								onChange={(e) => setTextValue(e.target.value)}
								className='w-full border border-slate-200 rounded-lg p-2 text-sm'
								rows={3}
							autoFocus
						/>
						<div className='flex justify-end gap-2'>
							<button
							onClick={() => {
								setAddingText(false)
								setTextValue('')
								setTextPos(null)
								setEditingTextId(null)
							}}
							className='px-3 py-2 text-sm rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50'
						>
							Cancel
						</button>
							<button
								onClick={() => {
									if (!textValue.trim()) {
										setAddingText(false)
										setTextValue('')
										setTextPos(null)
										return
									}
									if (editingTextId) {
										const updated = {
											id: editingTextId,
											type: 'text',
											x: textPos.x,
											y: textPos.y,
											text: textValue.trim(),
											color: strokeColor,
											size: fontSize,
											fontStyle
										}
										shapesRef.current = shapesRef.current.map((s) => (s.id === editingTextId ? updated : s))
										setShapes(shapesRef.current)
										sendOp({ action: 'updateText', shapeId: editingTextId, shape: updated })
									} else {
										const shape = {
											id: uid(),
											type: 'text',
											x: textPos.x,
											y: textPos.y,
											text: textValue.trim(),
											color: strokeColor,
											size: fontSize,
											fontStyle
										}
										shapesRef.current = [...shapesRef.current, shape]
										setShapes(shapesRef.current)
										sendOp({ action: 'add', shape })
									}
									setAddingText(false)
									setTextValue('')
									setTextPos(null)
									setTextBox(null)
									setEditingTextId(null)
								}}
								className='px-3 py-2 text-sm rounded-lg bg-slate-900 text-white font-semibold hover:bg-slate-800'
							>
								Add
							</button>
						</div>
					</div>
				</div>
			)}

			<canvas
				ref={canvasRef}
				className={`w-full h-full ${isReadOnly ? 'cursor-default' : tool === 'pen' ? 'cursor-crosshair' : 'cursor-pointer'}`}
				onPointerDown={handlePointerDown}
			/>

			{isReadOnly && (
				<div className='absolute top-3 left-1/2 -translate-x-1/2 bg-white text-xs font-medium px-3 py-1 rounded-full border border-gray-200 text-gray-600 shadow'>
					View only
				</div>
			)}
		</div>
	)
})

export default Whiteboard
