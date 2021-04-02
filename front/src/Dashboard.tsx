import { h, Fragment, JSX } from 'preact'
import { useEffect, useState } from 'preact/hooks'

import { UnitDetails } from './UnitDetails'
import { UnitListing } from './UnitListing'
import * as net from './net'

export interface Props {
  token: string
}

export function Dashboard (props: Props): JSX.Element {
  const [student, setStudent] = useState<net.Student | undefined>(undefined)
  const [units, setUnits] = useState<net.Unit[] | undefined>(undefined)
  const [selectedUnit, setSelectedUnit] = useState(-1)
  const [error, setError] = useState(false)

  useEffect(() => {
    const fetchStudent = async (): Promise<void> => {
      setStudent(await net.fetchStudentData(props.token))
    }
    fetchStudent().catch(err => {
      console.error('Failed to fetch student', err)
      setError(true)
    })
  }, [props.token])

  useEffect(() => {
    const fetchUnits = async (): Promise<void> => {
      setUnits(await net.fetchUnits(props.token))
    }
    fetchUnits().catch(err => {
      console.error('Failed to fetch units', err)
      setError(true)
    })
  }, [props.token])

  if (error) {
    return (
      <div class='alert alert-danger' role='alert'>
        Une erreur est survenue.
      </div>
    )
  }

  if (student === undefined || units === undefined) {
    return (
      <div class='spinner-border' role='status'>
        <span class='visually-hidden'>Chargement...</span>
      </div>
    )
  }

  const onSelectUnit = (index: number): void => {
    setSelectedUnit(index)
  }

  const onClickBack = (e: MouseEvent): void => {
    e.preventDefault()
    setSelectedUnit(-1)
  }

  let main
  let breadcrumb
  if (selectedUnit !== -1) {
    main = (
      <UnitDetails
        token={props.token}
        student={student}
        unit={units[selectedUnit]}
        groupA={student.groupA}
      />
    )
    breadcrumb = (
      <Fragment>
        <li class='breadcrumb-item'>
          <a href='#' onClick={onClickBack}>Chapitres</a>
        </li>
        <li class='breadcrumb-item active' aria-current='page'>
          {units[selectedUnit].name}
        </li>
      </Fragment>
    )
  } else {
    main = (
      <UnitListing
        units={units}
        groupA={student.groupA}
        onSelectUnit={onSelectUnit}
      />
    )
    breadcrumb = (
      <Fragment>
        <li class='breadcrumb-item active' aria-current='page'>
          Chapitres
        </li>
      </Fragment>
    )
  }

  return (
    <Fragment>
      <p>Bonjour <strong>{student.fullName}</strong>.</p>
      <nav aria-label='breadcrumb'>
        <ol class='breadcrumb'>
          {breadcrumb}
        </ol>
      </nav>
      {main}
    </Fragment>
  )
}
