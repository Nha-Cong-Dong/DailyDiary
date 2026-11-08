import type { Shape } from '../shape'
import type vi from '../vi/feedback'

// Bản dịch tiếng Anh, nhóm "feedback": phải có đủ khóa của bản tiếng Việt.
const en: Shape<typeof vi> = {
  rateLimited: "You've sent quite a bit of feedback just now. Please try again in a few minutes.",
  failed: "Couldn't send it. Check your connection and try again.",
  thanks: 'Thank you!',
  sent: 'Your feedback reached Jotly. If we need to ask more, we will reply to {{email}}.',
  yourAccountEmail: 'your account email',
  close: 'Close',
  title: 'Send feedback to Jotly',
  description:
    'What annoys you, or what would you like Jotly to have? Feedback is sent with your account email ({{email}}) so we can reply.',
  messageLabel: 'Your feedback',
  placeholder: 'For example: I would like a reminder to write at 9 pm…',
  sending: 'Sending…',
  send: 'Send feedback',
}

export default en
