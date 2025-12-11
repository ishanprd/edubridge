'use client'

import LiveSessionShell from '@/components/live/LiveSessionShell'
import { useParams } from 'next/navigation'

export default function LiveSessionDynamicPage() {
	const params = useParams()
	const { sessionId } = params
	return <LiveSessionShell roomId={sessionId} backHref='/' />
}
