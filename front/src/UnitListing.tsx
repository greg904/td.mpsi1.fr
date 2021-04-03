import { JSX } from 'preact'
import Masonry from 'react-masonry-css'

import { UnitCard } from './UnitCard'
import * as net from './net'
import * as config from './config'

export interface Props {
  units: net.Unit[]

  // Whether or not we are in group A.
  studentInEvenGroup: boolean
}

export function UnitListing (props: Props): JSX.Element {
  const deadlines = props.units.map(u => {
    const deadline = props.studentInEvenGroup ? u.deadlineA : u.deadlineB
    return deadline
  })

  const now = new Date().valueOf()
  const nextDeadline = Math.min(...deadlines.map(d => d.valueOf())
    .filter(d => {
      // The deadline is at the end of the day.
      return d + 1000 * 60 * 60 * 24 > now
    }))

  const units = props.units.map((u, i) => {
    return (
      <UnitCard
        key={i}
        id={u.id}
        name={u.name}
        deadline={deadlines[i]}
        exerciseCount={u.exerciseCount}
        nextBadge={deadlines[i].valueOf() === nextDeadline}
      />
    )
  })

  return (
    <Masonry
      breakpointCols={config.pageGridColumns}
      className='unit-grid'
      columnClassName='unit-grid__column'
    >
      {units}
    </Masonry>
  )
}
