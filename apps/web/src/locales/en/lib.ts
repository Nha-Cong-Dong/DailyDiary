import type { Shape } from '../shape'
import type vi from '../vi/lib'

// Bản dịch tiếng Anh, nhóm "lib": phải có đủ khóa của bản tiếng Việt.
const en: Shape<typeof vi> = {
  theme: {
    light: 'Light',
    dark: 'Dark',
    system: 'System',
    hour: 'By time',
    hourCaption: 'Dark from 8 PM to 5 AM on your device clock, light the rest of the day.',
    systemCaption: 'Follows the light/dark setting of your phone or computer.',
  },
  usage: {
    underTenth: '< 0.1 MB',
  },
  image: {
    avatarCompressFailed: "Couldn't compress the profile photo",
  },
  profile: {
    fallbackName: 'You',
    storageError: 'Photo storage returned {{status}}',
  },
}

export default en
