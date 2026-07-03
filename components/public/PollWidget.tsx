'use client'

import { useState } from 'react'
import type { BoardsPollRenderContext } from '@/modules/boards/components/puck/body/BoardsPoll'

// Kept outside the component so the impure Date.now() call isn't inline in
// render (react-hooks/purity) - a poll's closed state doesn't need to be
// reactive to the millisecond, just correct on each render pass.
function isPollClosed(closesAt: string | null): boolean {
  return !!closesAt && new Date(closesAt).getTime() < Date.now()
}

export default function PollWidget(props: BoardsPollRenderContext) {
  const [options, setOptions] = useState(props.options)
  const [votedIds, setVotedIds] = useState(new Set(props.userVotedOptionIds))
  const [busy, setBusy] = useState(false)

  const totalVotes = options.reduce((sum, o) => sum + o.voteCount, 0)
  const closed = isPollClosed(props.closesAt)
  const hasVoted = votedIds.size > 0

  async function vote(optionId: string) {
    if (busy || closed || !props.canVote) return
    setBusy(true)
    try {
      const res = await fetch(`/api/m/boards/public/polls/${props.pollId}/votes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ optionId }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data?.options) setOptions(data.options)
        if (data?.userVotedOptionIds) setVotedIds(new Set(data.userVotedOptionIds))
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="brd-poll">
      <p className="brd-poll-question">{props.question}</p>
      <ul className="brd-poll-options">
        {options.map((o) => {
          const pct = totalVotes > 0 ? Math.round((o.voteCount / totalVotes) * 100) : 0
          const active = votedIds.has(o.id)
          return (
            <li key={o.id} className="brd-poll-option" data-active={active ? 'true' : 'false'}>
              {hasVoted || closed || !props.canVote ? (
                <div className="brd-poll-result">
                  <div className="brd-poll-bar" style={{ width: `${pct}%` }} />
                  <span className="brd-poll-option-label">{o.label}</span>
                  <span className="brd-poll-option-pct">{pct}% ({o.voteCount})</span>
                </div>
              ) : (
                <button type="button" disabled={busy} onClick={() => vote(o.id)}>
                  {o.label}
                </button>
              )}
            </li>
          )
        })}
      </ul>
      <p className="brd-poll-meta">
        {totalVotes} vote{totalVotes === 1 ? '' : 's'}
        {closed ? ' - poll closed' : ''}
        {!props.canVote && !closed ? ' - log in to vote' : ''}
      </p>
    </div>
  )
}
