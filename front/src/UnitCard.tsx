import { JSX } from 'preact'
import { Link } from 'react-router-dom'

export interface Props {
  id: number
  name: string
  exerciseCount: number
  deadline: Date
  nextBadge: boolean
}

export function UnitCard (props: Props): JSX.Element {
  let badge = null
  if (props.nextBadge) {
    badge = <>
      &nbsp;
      <span class="badge bg-success">Prochain</span>
    </>
  }

  return (
    <div class='card bg-light'>
      <div class='card-body'>
        <h5 class='card-title'>{props.name}{badge}</h5>
        <dl class='mb-2'>
          <dt>Date de passage</dt>
          <dd>{props.deadline.toLocaleDateString()}</dd>
          <dt>Nombre d'exercices</dt>
          <dd>{props.exerciseCount}</dd>
        </dl>
        <Link className='stretched-link' to={`/chapitres/${props.id}`}>Réserver ou modifier</Link>
      </div>
    </div>
  )
}
