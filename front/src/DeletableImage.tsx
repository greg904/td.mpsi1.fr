export interface DeletableImageProps {
  class?: string
  src: string
  alt: string
  onClickDelete?: () => void
}

export function DeletableImage (props: DeletableImageProps): JSX.Element {
  let class_ = 'position-relative'
  if (props.class !== undefined) { class_ += ` ${props.class}` }

  return (
    <div class={class_}>
      <img
        src={props.src}
        alt={props.alt}
        class='img-fluid rounded'
      />
      <div class='dropdown position-absolute top-0 end-0 mt-3 me-3'>
        <button
          type='button'
          class='deletable-image__actions-btn btn btn-light btn-sm dropdown-toggle'
          data-bs-toggle='dropdown'
          aria-expanded='false'
        >
          Actions
        </button>
        <ul class='dropdown-menu'>
          <li>
            <a
              class='dropdown-item'
              target='_blank'
              rel='noreferrer noopener'
              href={props.src}
            >
              Ouvrir dans un nouvel onglet
            </a>
            <a
              class='dropdown-item'
              href='#'
              onClick={e => {
                e.preventDefault()
                if (props.onClickDelete !== undefined) { props.onClickDelete() }
              }}
            >
              Supprimer
            </a>
          </li>
        </ul>
      </div>
    </div>
  )
}
