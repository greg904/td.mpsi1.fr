import { Fragment, JSX } from 'preact'

import { UnitCard } from './UnitCard'
import * as net from './net'

export interface Props {
  units: net.Unit[]

  // Whether or not we are in group A.
  groupA: boolean
}

export function UnitListing (props: Props): JSX.Element {
  const deadlines = props.units.map(u => {
    const deadline = props.groupA ? u.deadlineA : u.deadlineB
    return deadline
  })

  const now = new Date().valueOf()
  const nextDeadline = Math.min(...deadlines.map(d => d.valueOf())
    .filter(d => {
      // The deadline is at the end of the day.
      return d + 1000 * 60 * 60 * 24 > now;
    }))

  const units = props.units.map((u, i) => {
    return (
      <div key={i} class={'col'}>
        <UnitCard
          id={u.id}
          name={u.name}
          deadline={deadlines[i]}
          exerciseCount={u.exerciseCount}
          nextBadge={deadlines[i].valueOf() === nextDeadline}
        />
      </div>
    )
  })

  return (
    <div class='row row-cols-1 row-cols-lg-2 row-cols-xxl-3 g-3'>
      {units}
    </div>
  )
}
