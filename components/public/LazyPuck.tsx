'use client'

// The page builder, fetched when a composer actually draws rather than shipped
// to every visitor on the site.
//
// The composers here use Puck as a rich-text editor: a one-component config, no
// canvas, no sidebar. That is a perfectly reasonable thing to reuse, but the
// import edge it created was not. Next.js attaches a client component's chunk to
// every route whose server graph can reach it, and boards' Puck blocks are in
// the generated module component map, which every public page reaches - so the
// whole page-builder runtime was being parsed by shoppers on a shop category
// page with no forum anywhere near it. Measured on deskwell.co.uk in August
// 2026: about 220 KB gzipped, on a page that never renders a composer.
//
// `next/dynamic` is the one import edge Next does not follow eagerly (see
// scripts/analyse-public-bundle.mjs, which exists to measure exactly this), so
// the runtime becomes a chunk fetched the moment a composer mounts and never
// otherwise. A visitor who opens a thread to reply waits a moment longer for the
// editor; every other visitor to the site stops paying for it entirely.
//
// ssr:false because there is nothing to server-render here: the editor is
// interactive by definition, and both composers are client components already.

import dynamic from 'next/dynamic'
import type { Puck as PuckComponent } from '@puckeditor/core'

export const LazyPuck = dynamic(() => import('@puckeditor/core').then((m) => ({ default: m.Puck })), {
  ssr: false,
  // The composers already wrap this in a fixed-height bordered box, so an empty
  // placeholder holds the same space the editor will take and nothing on the
  // page moves when it arrives.
  loading: () => <div style={{ minHeight: 180 }} aria-busy="true" />,
}) as unknown as typeof PuckComponent
