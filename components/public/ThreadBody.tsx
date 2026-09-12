import { makeBodyRscConfig } from '@/modules/boards/components/puck/body/bodyRscConfig'
import type { BoardsPollRenderContext } from '@/modules/boards/components/puck/body/BoardsPoll'
import { CactusRender } from '@/lib/puck/CactusRender'

export default function ThreadBody({ openerData, pollContext }: { openerData: unknown; pollContext: BoardsPollRenderContext | null }) {
  if (!openerData) return null
  const config = makeBodyRscConfig(pollContext)
  return <CactusRender config={config} data={openerData as any} />
}
