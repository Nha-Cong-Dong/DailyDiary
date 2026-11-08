import type { Shape } from '../shape'
import type vi from '../vi/catalog'

// Bản dịch tiếng Anh, nhóm "catalog": phải có đủ khóa của bản tiếng Việt.
const en: Shape<typeof vi> = {
  iconSets: {
    sprout: { name: 'Seed to bloom', levels: { '1': 'Seed', '2': 'Sprout', '3': 'Bud', '4': 'Opening', '5': 'In bloom' } },
    face: { name: 'Mood faces', levels: { '1': 'Awful', '2': 'A bit sad', '3': 'Okay', '4': 'Happy', '5': 'Great' } },
    moon: { name: 'Moon phases', levels: { '1': 'New moon', '2': 'Crescent', '3': 'Half moon', '4': 'Almost full', '5': 'Full moon' } },
    sakura: { name: 'Cherry blossom', levels: { '1': 'Fallen', '2': 'Wilted', '3': 'Budding', '4': 'Blooming', '5': 'Radiant' } },
    sun: { name: 'Weather sun', levels: { '1': 'Thunderstorm', '2': 'Cloudy', '3': 'Partly cloudy', '4': 'Sunny', '5': 'Radiant' } },
    bean: { name: 'Little bean', levels: { '1': 'Crying', '2': 'Sad', '3': 'Okay', '4': 'Happy', '5': 'Delighted' } },
  },
  flags: {
    blush: 'Blush',
    peach: 'Peach',
    butter: 'Butter',
    sage: 'Sage',
    mint: 'Mint',
    sky: 'Sky blue',
    periwinkle: 'Periwinkle',
    lavender: 'Lavender',
  },
  customFlag: 'Custom color',
}

export default en
