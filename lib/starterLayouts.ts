// Starter layout templates for the boardsCategory/boardsEntry layout types,
// collected by scripts/generate-module-layout-types.mjs (core) via this
// module's cactus.module.json layoutTypes.types[].starterImport/starterExport.
// Seeded as drafts only (see lib/setup/starterLayouts.ts) - the site owner
// opts in by publishing one.

const block = (type: string, id: string, props: Record<string, unknown> = {}) => ({ type, props: { id, ...props } })

const split = (id: string, ratio: string) => ({ type: 'Split', props: { id, ratio, align: 'stretch', gap: 'lg', padding: 'none' } })

const section = (id: string, overrides: Record<string, unknown> = {}) => ({
  type: 'Section',
  props: {
    id, bgType: 'none', bgColor: '', bgImage: '', bgSize: 'cover',
    overlayColor: '', overlayOpacity: 0, paddingY: 'md', maxWidth: 'standard',
    textColor: '', sticky: 'off', stickyOffset: '0px', boxShadow: 'none',
    borderStyle: 'none', borderColor: 'var(--color-border)', borderWidth: '1px',
    borderRadius: 'none', opacity: '100',
    animationType: 'none', animationDuration: 'normal', animationDelay: 'none',
    content: [],
    ...overrides,
  },
})

// ---------------------------------------------------------------------------
// Category templates (3) - sub-board list is the "secondary" region here
// ---------------------------------------------------------------------------

export function boardsCategoryStarters() {
  return [
    {
      id: 'starter-boards-category-sidebar',
      name: 'Grid with Sidebar',
      description: 'Thread list on the left (70%), sub-boards on the right (30%).',
      data: {
        content: [
          block('BoardHeader', 'header-1'),
          split('columns-1', '70/30'),
        ],
        root: { props: {} },
        zones: {
          'columns-1:left': [block('ThreadList', 'list-1')],
          'columns-1:right': [block('SubBoardList', 'subboards-1')],
        },
      },
    },
    {
      id: 'starter-boards-category-banner',
      name: 'Full Width with Banner',
      description: 'Header, full-width sub-board banner, then a full-width thread list below.',
      data: {
        content: [
          block('BoardHeader', 'header-1'),
          block('SubBoardList', 'subboards-1'),
          block('ThreadList', 'list-1'),
        ],
        root: { props: {} },
        zones: {},
      },
    },
    {
      id: 'starter-boards-category-compact',
      name: 'Compact List',
      description: 'Narrow boxed header, dense thread list, no sub-board panel.',
      data: {
        content: [
          section('section-1', { maxWidth: 'narrow', content: [block('BoardHeader', 'header-1')] }),
          block('ThreadList', 'list-1'),
        ],
        root: { props: {} },
        zones: {},
      },
    },
  ]
}

// ---------------------------------------------------------------------------
// Entry templates (3)
// ---------------------------------------------------------------------------

export function boardsEntryStarters() {
  return [
    {
      id: 'starter-boards-entry-sidebar',
      name: 'Media-Forward with Sidebar',
      description: 'Thread header and body (70%) with the reply list in a sidebar area (30%).',
      data: {
        content: [split('columns-1', '70/30')],
        root: { props: {} },
        zones: {
          'columns-1:left': [block('ThreadHeader', 'header-1'), block('ThreadBody', 'body-1')],
          'columns-1:right': [block('ReplyList', 'replies-1')],
        },
      },
    },
    {
      id: 'starter-boards-entry-hero',
      name: 'Full Width Hero then Details',
      description: 'Full-width header, boxed body, replies stacked below.',
      data: {
        content: [
          block('ThreadHeader', 'header-1'),
          section('section-1', { content: [block('ThreadBody', 'body-1')] }),
          block('ReplyList', 'replies-1'),
        ],
        root: { props: {} },
        zones: {},
      },
    },
    {
      id: 'starter-boards-entry-split',
      name: 'Two Column Split',
      description: 'Header full-width, then body and thread meta split 50/50, replies full-width beneath.',
      data: {
        content: [
          block('ThreadHeader', 'header-1'),
          split('columns-1', '50/50'),
          block('ReplyList', 'replies-1'),
        ],
        root: { props: {} },
        zones: {
          'columns-1:left': [block('ThreadBody', 'body-1')],
          'columns-1:right': [],
        },
      },
    },
  ]
}
