import type { Shape } from '../shape'
import type vi from '../vi/letters'

// Bản dịch tiếng Anh, nhóm "letters": phải có đủ khóa của bản tiếng Việt.
const en: Shape<typeof vi> = {
  back: 'Profile',
  title: 'Letters to the future',
  intro: 'Write a letter to yourself on a later day. The content only opens on the date you chose.',
  loading: 'Loading letters…',
  loadError: "Letters couldn't be loaded, please try again",
  empty: 'No letters yet. Write your first one to your future self.',
  newTitle: 'Write a new letter',
  newHint: 'One letter per day. Once sent, the content can’t be edited.',
  contentLabel: 'Letter content',
  contentPlaceholder: 'To you on a future day…',
  dateLabel: 'Open on',
  send: 'Send letter',
  onePerDay: 'One letter per day',
  sealedUntil: 'Sealed · opens {{date}}',
  openedOn: 'Opened · {{date}}',
  delete: 'Delete letter',
  deleteConfirm: 'Delete this letter for good? Its content will no longer open.',
  deleteConfirmAction: 'Delete',
  cancel: 'Cancel',
}

export default en
