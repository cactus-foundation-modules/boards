export type BoardsPullQuoteProps = { quote?: string; attribution?: string }

export function BoardsPullQuote({ quote, attribution }: BoardsPullQuoteProps) {
  return (
    <figure className="brd-pullquote">
      <blockquote>{quote || 'Pull quote…'}</blockquote>
      {attribution && <figcaption>- {attribution}</figcaption>}
    </figure>
  )
}

export const boardsPullQuoteFieldDef = {
  label: 'Pull quote',
  fields: {
    quote: { type: 'textarea' as const, label: 'Quote' },
    attribution: { type: 'text' as const, label: 'Attribution (optional)' },
  },
  defaultProps: { quote: '', attribution: '' },
  render: BoardsPullQuote,
}
