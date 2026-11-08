import type { Shape } from '../shape'
import type vi from '../vi/common'

// English translation, group "common": must have every key of the Vietnamese file.
const en: Shape<typeof vi> = {
  meta: { title: 'Jotly · Tap to jot, open to look back' },
  language: {
    label: 'Language',
    vi: 'Tiếng Việt',
    en: 'English',
    viShort: 'VI',
    enShort: 'EN',
  },
  date: {
    weekdayShort: { '0': 'Sun', '1': 'Mon', '2': 'Tue', '3': 'Wed', '4': 'Thu', '5': 'Fri', '6': 'Sat' },
    weekdayLong: {
      '0': 'Sunday',
      '1': 'Monday',
      '2': 'Tuesday',
      '3': 'Wednesday',
      '4': 'Thursday',
      '5': 'Friday',
      '6': 'Saturday',
    },
    monthLong: {
      '1': 'January',
      '2': 'February',
      '3': 'March',
      '4': 'April',
      '5': 'May',
      '6': 'June',
      '7': 'July',
      '8': 'August',
      '9': 'September',
      '10': 'October',
      '11': 'November',
      '12': 'December',
    },
    monthShort: {
      '1': 'Jan',
      '2': 'Feb',
      '3': 'Mar',
      '4': 'Apr',
      '5': 'May',
      '6': 'Jun',
      '7': 'Jul',
      '8': 'Aug',
      '9': 'Sep',
      '10': 'Oct',
      '11': 'Nov',
      '12': 'Dec',
    },
    // "Sunday · October 18, 2026"
    longDate: '{{weekday}} · {{monthLong}} {{day}}, {{year}}',
    longDateNoYear: '{{weekday}} · {{monthLong}} {{day}}',
    // "Sunday, Oct 18"
    shortDate: '{{weekday}}, {{monthShort}} {{day}}',
    // "2 h 56 min"
    durationMinutes: '{{m}} min',
    durationHoursMinutes: '{{h}} h {{m}} min',
    durationHours: '{{h}} h',
  },
}

export default en
