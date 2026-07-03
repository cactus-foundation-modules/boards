import { ImageUrlPickerField } from '@/lib/puck/MediaPickerField'

export type BoardsImageProps = { mediaUrl?: string; alt?: string; caption?: string }

export function BoardsImage({ mediaUrl, alt, caption }: BoardsImageProps) {
  if (!mediaUrl) {
    return <div className="brd-image-placeholder">Choose an image in the panel</div>
  }
  return (
    <figure className="brd-image">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={mediaUrl} alt={alt ?? ''} />
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  )
}

export const boardsImageFieldDef = {
  label: 'Image',
  fields: {
    mediaUrl: { type: 'custom' as const, label: 'Image', render: ImageUrlPickerField },
    alt: { type: 'text' as const, label: 'Alt text' },
    caption: { type: 'text' as const, label: 'Caption' },
  },
  defaultProps: { mediaUrl: '', alt: '', caption: '' },
  render: BoardsImage,
}

// RSC variant: the media picker is an editor-only affordance - swap to a plain
// text field so it isn't pulled into the public render config at all.
export const boardsImageRscFieldDef = {
  ...boardsImageFieldDef,
  fields: { ...boardsImageFieldDef.fields, mediaUrl: { type: 'text' as const, label: 'Image URL' } },
}
