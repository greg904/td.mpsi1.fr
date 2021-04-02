import { h, Fragment, JSX } from 'preact'

import { UnitCard } from './UnitCard'
import * as net from './net'

export interface Props {
  units: net.Unit[]

  // Whether or not we are in group A.
  groupA: boolean

  onSelectUnit?: (index: number) => void
}

export function UnitListing (props: Props): JSX.Element {
  const units = props.units.map((u, i) => {
    const first = i === 0

    return (
      <div key={i} class={first ? undefined : 'pt-3'}>
        <UnitCard
          unit={u}
          groupA={props.groupA}
          onClickEdit={() => {
            if (props.onSelectUnit != null) { props.onSelectUnit(i) }
          }}
        />
      </div>
    )
  })

  return (
    <Fragment>
      {units}
    </Fragment>
  )
}
