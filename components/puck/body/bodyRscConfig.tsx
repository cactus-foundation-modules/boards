import { boardsProseRscFieldDef } from './BoardsProse'
import { boardsPullQuoteFieldDef } from './BoardsPullQuote'
import { boardsCodeFieldDef, BoardsCodeRsc } from './BoardsCode'
import { boardsImageRscFieldDef } from './BoardsImage'
import { makeBoardsPollRscFieldDef, type BoardsPollRenderContext } from './BoardsPoll'
import { boardsEmbedFieldDef } from './BoardsEmbed'

export function makeBodyRscConfig(pollContext: BoardsPollRenderContext | null) {
  return {
    categories: {
      threadContent: {
        title: 'Thread content',
        components: ['BoardsProse', 'BoardsPullQuote', 'BoardsCode', 'BoardsImage', 'BoardsPoll', 'BoardsEmbed'],
        defaultExpanded: true,
      },
    },
    components: {
      BoardsProse: boardsProseRscFieldDef,
      BoardsPullQuote: boardsPullQuoteFieldDef,
      BoardsCode: { ...boardsCodeFieldDef, render: BoardsCodeRsc },
      BoardsImage: boardsImageRscFieldDef,
      BoardsPoll: makeBoardsPollRscFieldDef(pollContext),
      BoardsEmbed: boardsEmbedFieldDef,
    },
  } as any
}
