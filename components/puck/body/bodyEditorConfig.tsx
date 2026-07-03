import { boardsProseFieldDef } from './BoardsProse'
import { boardsPullQuoteFieldDef } from './BoardsPullQuote'
import { boardsCodeFieldDef } from './BoardsCode'
import { boardsImageFieldDef } from './BoardsImage'
import { boardsPollFieldDef } from './BoardsPoll'
import { boardsEmbedFieldDef } from './BoardsEmbed'

export const bodyEditorConfig = {
  categories: {
    threadContent: {
      title: 'Thread content',
      components: ['BoardsProse', 'BoardsPullQuote', 'BoardsCode', 'BoardsImage', 'BoardsPoll', 'BoardsEmbed'],
      defaultExpanded: true,
    },
  },
  components: {
    BoardsProse: boardsProseFieldDef,
    BoardsPullQuote: boardsPullQuoteFieldDef,
    BoardsCode: boardsCodeFieldDef,
    BoardsImage: boardsImageFieldDef,
    BoardsPoll: boardsPollFieldDef,
    BoardsEmbed: boardsEmbedFieldDef,
  },
}

export type BodyEditorConfig = typeof bodyEditorConfig
