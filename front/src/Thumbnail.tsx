export interface ThumbnailProps {
  src: string
  alt: string
  onClickDelete?: () => void
}

export function Thumbnail (props: ThumbnailProps): JSX.Element {
  return (
    <div class='d-inline-block position-relative'>
      <img
        src={props.src}
        alt={props.alt}
        class='img-thumbnail'
      />
      <button
        type='button'
        class='btn-close position-absolute top-0 end-0 mt-3 me-3 p-2 bg-light'
        aria-label='Supprimer'
        onClick={() => {
          if (props.onClickDelete !== undefined) { props.onClickDelete() }
        }}
      />
    </div>
  )
}
