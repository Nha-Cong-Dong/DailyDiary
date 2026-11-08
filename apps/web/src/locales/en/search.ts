import type { Shape } from '../shape'
import type vi from '../vi/search'

// English translation, group "search": must have every key of the Vietnamese file.
const en: Shape<typeof vi> = {
  title: 'Search by keyword',
  subtitle: 'Search the titles, text and keywords of every page.',
  scoreOnly: 'Rating only',
  input: {
    label: 'Keyword',
    placeholder: 'Search your journal',
    clear: 'Clear search',
    back: 'Back to Timeline',
  },
  topKeywords: 'Frequent keywords',
  idle: {
    heading: 'What do you want to find again?',
    hint: 'Type a keyword. Or try one of these:',
    recent: 'Recent pages',
    recentMeta: '{{date}} · Score {{score}}',
  },
  filters: {
    group: 'Filters',
    byScore: 'Filter by score',
    score: 'Score',
    scoreSome: 'Score {{list}}',
    scoreAria: 'Score {{score}}, {{label}}',
    time: 'Time',
    photos: 'With photos',
    clear: 'Clear filters',
  },
  periods: {
    month: 'This month',
    '3m': '3 months',
    year: 'This year',
    all: 'All time',
  },
  newUser: {
    noMatch: 'No pages contain “{{query}}”',
    title: 'No pages to search yet',
    body: 'Once you write and add keywords, every page will be searchable here. For example, search “coffee” to reopen the days with a cup of coffee.',
    cta: 'Write your first page',
  },
  error: 'Could not search right now. Try again in a few minutes.',
  loading: 'Searching…',
  results: {
    count_one: '{{count}} result for “{{query}}”',
    count_other: '{{count}} results for “{{query}}”',
    hidden_one: ' · {{count}} other page hidden by filters',
    hidden_other: ' · {{count}} other pages hidden by filters',
    loadingMore: 'Loading…',
    more_one: 'Show {{count}} older result',
    more_other: 'Show {{count}} older results',
  },
  card: {
    scoreAria: 'Score {{score}}, {{label}}',
    phoneMeta: '{{date}} · Score {{score}}',
    phoneDate: '{{weekday}}, {{monthShort}} {{day}}, {{year}}',
    meta: '{{date}} · Score {{score}} · {{label}}',
    photos_one: '{{count}} photo',
    photos_other: '{{count}} photos',
  },
  filtered: {
    title: 'No pages match the filters',
    body_one: '{{count}} page contains “{{query}}”, but it does not fit the score, time or photos you picked.',
    body_other: '{{count}} pages contain “{{query}}”, but none fit the score, time or photos you picked.',
  },
  notFound: {
    title: 'Nothing found for “{{query}}”',
    hint: 'Try a shorter word, or type without accents.',
  },
  sheet: {
    scoreTitle: 'Filter by score',
    pickScore: 'Pick scores',
    scoreRow: 'Score {{score}}, {{label}}',
    deselect: 'Deselect all',
    done: 'Done',
    periodTitle: 'Time range',
  },
}

export default en
