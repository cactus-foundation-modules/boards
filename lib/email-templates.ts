import type { EmailTemplateDef } from '@/lib/email/registry'

// This module's two emails, declared for core's single email editor
// (Settings > Emails). Core owns the wording, the on/off switch, the wrapper
// design and the sending; this file is only the defaults.
//
// `items` is the list markup lib/digest.ts assembles, thread titles escaped as
// it goes - hence rawTags. Everything else is escaped by core as normal.

export const boardsEmailTemplates: EmailTemplateDef[] = [
  {
    key: 'boards.notification',
    label: 'Board notification',
    subject: '{{title}}',
    bodyHtml: '<p>{{title}}</p><p><a href="{{url}}">{{url}}</a></p>',
    mergeTags: ['title', 'url', 'siteName'],
    requiredTags: ['url'],
    transactional: false,
  },
  {
    key: 'boards.digest',
    label: 'Boards digest',
    subject: 'Your {{siteName}} boards digest',
    bodyHtml: "<p>Here's what's new in the discussions you follow:</p><ul>{{items}}</ul>",
    mergeTags: ['siteName', 'items'],
    requiredTags: ['items'],
    rawTags: ['items'],
    transactional: false,
  },
]
