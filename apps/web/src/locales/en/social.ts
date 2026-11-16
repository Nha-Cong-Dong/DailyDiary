export default {
  title: 'Friends & shared journals',
  intro: 'Write together and keep the warm days close.',
  friendCode: { title: 'Your friend code', copy: 'Copy code', copied: 'Copied', rotate: 'Change code', confirmTitle: 'Change friend code?', confirmBody: 'The old code will stop working immediately.', cancel: 'Not now', confirm: 'Change code' },
  send: { title: 'Add a friend', placeholder: 'Enter their friend code', submit: 'Send invite', sent: 'Invite sent', limit: 'You have reached your friend limit.', invalid: 'This friend code was not found.' },
  requests: { title: 'Friend requests', incoming: 'Incoming', outgoing: 'Sent', accept: 'Accept', decline: 'Decline', pending: 'Pending', empty: 'No requests yet.' },
  friends: { title: 'Friends', count: '{{count}}/{{max}} friends', empty: 'Your friend list is empty.', invite: 'Invite someone with the code above', journal: 'Open shared journal', noJournal: 'No shared journal yet' },
  journals: { title: 'Shared journals', count: '{{count}}/{{max}} journals', empty: 'No shared journals yet.', open: 'Open journal', active: 'Active', ended: 'Ended', warm: 'Warm streak', synced: 'Synced days', longest: 'Longest' },
  detail: { back: 'All shared journals', members: 'Members', write: "Write today's entry", score: "Today's score", title: 'Title', content: 'What is on your mind?', save: 'Save entry', saved: 'Saved', mine: 'You', feed: 'Written days', empty: 'No entries in this journal yet.', ended: 'Journal ended · view only', loadMore: 'Load more' },
  photos: { title: 'Photos for the day', add: 'Add photo', uploading: 'Uploading photo…', limit: 'Up to {{count}} photos per entry', remove: 'Remove photo', failed: 'Photo upload failed.' },
  states: { loading: 'Opening shared journal…', error: 'Social data could not be loaded.', retry: 'Try again', emptyTitle: 'Start writing together', emptyBody: 'Send your friend code to someone to open your first shared journal.' },
} as const
