import { JSX } from 'preact'

export interface LoaderProps {
  small?: boolean
}

export function Loader (props: LoaderProps): JSX.Element {
  let className = 'spinner-border'
  if (props.small !== undefined && props.small) { className += ' spinner-border-sm' }

  return (
    <div class={className} role='status'>
      <span class='visually-hidden'>Chargement...</span>
    </div>
  )
}
