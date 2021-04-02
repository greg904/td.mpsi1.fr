import { h, Fragment, JSX } from 'preact'

import Unit from './Unit'
import { UnitCard } from './UnitCard'

export interface Props {
  units: Unit[]
  groupA: boolean
  onSelectUnit: (index: number) => void
}

export function UnitListing (props: Props): JSX.Element {
  return (
    <Fragment>
      {props.units.map((u, i) => {
        const last = i === props.units.length - 1
        return (
          <div key={i} class={last ? '' : 'mb-3'}>
            <UnitCard
              unit={u}
              groupA={props.groupA}
              onClickEdit={() => props.onSelectUnit(i)}
            />
          </div>
        )
      })}
    </Fragment>
  )
}
