import { h, JSX } from 'preact'

export default function Loader (): JSX.Element {
  return (
    <div class='spinner-border' role='status'>
      <span class='visually-hidden'>Chargement...</span>
    </div>
  )
}
