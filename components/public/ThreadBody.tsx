import { Render } from '@puckeditor/core/rsc'
import { makeBodyRscConfig } from '@/modules/boards/components/puck/body/bodyRscConfig'
import type { BoardsPollRenderContext } from '@/modules/boards/components/puck/body/BoardsPoll'

export default function ThreadBody({ openerData, pollContext }: { openerData: unknown; pollContext: BoardsPollRenderContext | null }) {
  if (!openerData) return null
  const config = makeBodyRscConfig(pollContext)
  return <Render config={config} data={openerData as any} />
}
