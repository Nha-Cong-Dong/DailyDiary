import type { Shape } from '../shape'
import type vi from '../vi/errors'

// Bản dịch tiếng Anh, nhóm "errors": phải có đủ khóa của bản tiếng Việt.
const en: Shape<typeof vi> = {
  generic: 'Something went wrong. Please try again.',
  api: {
    AUTH_REQUIRED: 'Please sign in to continue',
    CSRF_FAILED: 'Invalid request',
    FORBIDDEN: "You don't have permission to do that",
    BAD_REQUEST: 'Invalid request',
    NOT_FOUND: 'Not found',
    METHOD_NOT_ALLOWED: 'This method is not supported',
    CONFLICT: 'The data has changed',
    PAYLOAD_TOO_LARGE: 'The data is too large',
    HTTP_ERROR: 'The request was not successful',
    INTERNAL_ERROR: 'Something went wrong. Please try again.',
    VALIDATION_ERROR: 'Invalid data',
    RATE_LIMITED: "You're going too fast. Try again in a few minutes.",
    STORAGE_UNAVAILABLE: 'Photo storage is not ready yet',
    DB_UNAVAILABLE: 'The database is not ready yet',
    ACCOUNT_DELETED: 'This account is waiting to be deleted',
    REAUTH_REQUIRED: 'Sign in again to confirm deleting your account',
    CONFIRM_MISMATCH: "The confirmation email doesn't match your account",
    ENTRY_NOT_FOUND: "There's no page for this day yet",
    ENTRY_CONFLICT: 'This page was just edited somewhere else',
    ENTRY_LIMIT_TITLE: 'The title can be up to {{n}} characters',
    ENTRY_LIMIT_CONTENT: 'The text can be up to {{n}} characters',
    ENTRY_LIMIT_KEYWORDS: 'Up to {{n}} keywords',
    ENTRY_LIMIT_KEYWORD: 'Each keyword must be {{min}}–{{max}} characters',
    ENTRY_FUTURE_DATE: "You can't write for a day that hasn't come yet",
    FEEDBACK_TOO_LONG: 'Feedback can be up to {{n}} characters',
    ENTRY_LIMIT_PHOTOS: 'Up to {{n}} photos per day',
    STORAGE_QUOTA: 'Photo storage is full',
    PHOTOS_BUSY: "This page's photos are being changed. Try again shortly.",
    PHOTO_INVALID: "This photo wasn't fully uploaded or isn't a supported format",
    PHOTO_ORDER_INVALID: "The photo list doesn't match this page",
    PHOTO_NOT_FOUND: 'Photo not found',
    SHARE_EMPTY: 'Turn on at least one part to share',
    AVATAR_INVALID: "The profile photo wasn't fully uploaded, is too large, or isn't a supported format",
    FLAG_COLORS_LIMIT: 'Up to {{n}} custom color flags',
  },
}

export default en
