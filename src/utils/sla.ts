import type { Session, SlaState } from '@/types/chat'

export const FIRST_REPLY_LIMIT_SEC = 20
export const ROUND_REPLY_LIMIT_SEC = 120

export function hasAgentReplied(session: Session) {
  return session.messages.some((m) => m.type === 'agent')
}

export function formatDuration(totalSec: number) {
  const sec = Math.max(0, Math.abs(Math.floor(totalSec)))
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function calcSlaState(
  session: Session | null | undefined,
  nowMs: number,
): SlaState | null {
  if (!session) return null
  if (session.status === 'ended' || session.status === 'transferred') return null
  if (session.aiTakeover) return null
  if (!session.waitingStartedAt) return null

  const first = !hasAgentReplied(session)
  const limitSec = first ? FIRST_REPLY_LIMIT_SEC : ROUND_REPLY_LIMIT_SEC
  const elapsedSec = Math.max(
    0,
    Math.floor((nowMs - session.waitingStartedAt) / 1000),
  )
  const remainSec = limitSec - elapsedSec
  const overtime = remainSec < 0

  let level: SlaState['level'] = 'ok'
  if (overtime) level = 'danger'
  else if (remainSec <= Math.ceil(limitSec * 0.3)) level = 'warn'

  return {
    mode: first ? 'first' : 'round',
    limitSec,
    elapsedSec,
    remainSec,
    overtime,
    level,
  }
}
