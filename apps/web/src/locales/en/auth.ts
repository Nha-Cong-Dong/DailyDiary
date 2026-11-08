import type { Shape } from '../shape'
import type vi from '../vi/auth'

// Bản dịch tiếng Anh, nhóm "auth": phải có đủ khóa của bản tiếng Việt.
const en: Shape<typeof vi> = {
  login: {
    homeAria: 'Jotly, home',
    idle: {
      title: 'Sign in to Jotly',
      text: 'Use your Gmail account. No extra password to remember.',
      button: 'Continue with Google',
    },
    waking: {
      title: 'Waking up the server…',
      text: 'The server naps when nobody is around, so the first visit can take up to a minute. No need to click again.',
    },
    redirecting: { title: 'Signing you in', text: 'Taking you to Google to sign in.' },
    error: { title: "Couldn't sign you in", button: 'Try Google again' },
    expired: {
      title: 'Your session has expired',
      text: 'Sign in again to continue. Whatever you were writing is still saved in this browser.',
      button: 'Sign in again with Google',
    },
    waitingServer: 'Waiting for the server…',
    waitingGoogle: 'Waiting for Google…',
    cancel: 'Cancel',
    termsPrefix: 'By continuing, you agree to the',
    terms: '[Terms of use]',
    and: 'and the',
    privacy: 'Privacy policy',
    devLogin: 'Test sign-in (dev only)',
    devLoginFailed: "Couldn't do the test sign-in. Set DEV_LOGIN=true in apps/api/.env and restart the API.",
  },
  loginErrors: {
    oauth: 'Google did not finish signing you in. You may have clicked Cancel on the Google page, or the page was closed midway.',
    email_unverified: "This Google email isn't verified yet, so we can't sign you in. Verify it with Google and try again.",
    account_deleted: "This account is waiting to be deleted, so it can't sign in again.",
    not_configured: "The server isn't set up for Google sign-in yet. Please let the Jotly admin know.",
    unknown: 'Sign-in failed because of an unknown error.',
  },
}

export default en
