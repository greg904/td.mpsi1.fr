import { h, JSX } from 'preact'

import * as net from './net'

export interface Props {
  unit: net.Unit
  groupA: boolean
  onClickEdit?: () => void
}

export function UnitCard (props: Props): JSX.Element {
  const deadline = props.groupA ? props.unit.deadlineA : props.unit.deadlineB

  const onClickEdit = (e: MouseEvent): void => {
    e.preventDefault()

    if (props.onClickEdit != null) { props.onClickEdit() }
  }

  return (
    <div class='card'>
      <div class='card-body'>
        <h5 class='card-title'>{props.unit.name}</h5>
        <h6 class='card-subtitle mb-2 text-muted'>{deadline.toLocaleDateString()}</h6>
        <a href='#' class='card-link' onClick={onClickEdit}>Réserver ou modifier</a>
      </div>
    </div>
  )
}
