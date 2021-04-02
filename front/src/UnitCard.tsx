import { JSX } from 'preact'
import { Link } from 'react-router-dom'

import * as net from './net'

export interface Props {
  unit: net.Unit
  groupA: boolean
}

export function UnitCard (props: Props): JSX.Element {
  const deadline = props.groupA ? props.unit.deadlineA : props.unit.deadlineB

  return (
    <div class='card'>
      <div class='card-body'>
        <h5 class='card-title'>{props.unit.name}</h5>
        <h6 class='card-subtitle mb-2 text-muted'>{deadline.toLocaleDateString()}</h6>
        <Link className='card-link' to={`/chapitres/${props.unit.id}`}>Réserver ou modifier</Link>
      </div>
    </div>
  )
}
