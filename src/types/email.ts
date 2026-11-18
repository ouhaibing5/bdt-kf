export type EmailDirection = 'in' | 'out'

export interface EmailMessage {
  id: string
  threadId: string
  direction: EmailDirection
  from: string
  to: string
  subject: string
  body: string
  sentAt: string
  alsNo: string | null
  customerName: string
  customerEmail: string
  replied: boolean
  agentName?: string
}

export const SERVICE_EMAIL = 'service@bdt-logistics.com'

export const EMAIL_DIRECTIONS = [
  { label: '收件', value: 'in' },
  { label: '发件', value: 'out' },
] as const