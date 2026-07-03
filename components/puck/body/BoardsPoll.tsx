import PollWidget from '@/modules/boards/components/public/PollWidget'

export type BoardsPollOptionDraft = { label?: string }
export type BoardsPollProps = {
  question?: string
  options?: BoardsPollOptionDraft[]
  allowMultiple?: boolean
  closesAt?: string
}

// Editor-canvas preview only - the authored question/options are what the
// thread API materialises into brd_polls/brd_poll_options on save. Once a
// poll exists, public rendering ignores these authored props entirely and
// reads live results from the tables (see makeBoardsPollRscFieldDef below).
export function BoardsPoll({ question, options = [], allowMultiple }: BoardsPollProps) {
  return (
    <div className="brd-poll-preview">
      <p className="brd-poll-question">{question || 'Poll question…'}</p>
      <ul>
        {options.length > 0
          ? options.map((o, i) => <li key={i}>{o.label || `Option ${i + 1}`}</li>)
          : <li style={{ color: 'var(--color-text-muted)' }}>Add options in the panel</li>}
      </ul>
      {allowMultiple && <p className="brd-poll-hint">Members may pick more than one option.</p>}
    </div>
  )
}

export const boardsPollFieldDef = {
  label: 'Poll',
  fields: {
    question: { type: 'text' as const, label: 'Question' },
    options: {
      type: 'array' as const,
      label: 'Options',
      getItemSummary: (item: BoardsPollOptionDraft) => item.label || 'Option',
      arrayFields: { label: { type: 'text' as const, label: 'Label' } },
      defaultItemProps: { label: '' },
    },
    allowMultiple: { type: 'radio' as const, label: 'Allow selecting multiple options', options: [{ value: true, label: 'Yes' }, { value: false, label: 'No' }] },
    closesAt: { type: 'text' as const, label: 'Closes at (ISO date, optional)' },
  },
  defaultProps: { question: '', options: [{ label: '' }, { label: '' }], allowMultiple: false, closesAt: '' },
  render: BoardsPoll,
}

export type BoardsPollRenderContext = {
  pollId: string
  question: string
  options: Array<{ id: string; label: string; voteCount: number }>
  totalVotes: number
  allowMultiple: boolean
  closesAt: string | null
  userVotedOptionIds: string[]
  canVote: boolean
}

// RSC variant: mirrors Gazette's makeGazetteProseRscFieldDef(headings) factory -
// the host page fetches live poll results for the thread once, then builds this
// field def so the render ignores the authored props and shows real counts.
export function makeBoardsPollRscFieldDef(context: BoardsPollRenderContext | null) {
  return {
    ...boardsPollFieldDef,
    render: () => {
      if (!context) {
        return <div className="brd-poll-preview" style={{ color: 'var(--color-text-muted)' }}>Poll unavailable.</div>
      }
      return <PollWidget {...context} />
    },
  }
}
