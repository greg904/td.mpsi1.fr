import { h, Fragment, JSX } from 'preact'
import { useEffect, useState } from 'preact/hooks'

import Student from './Student'
import Unit from './Unit'
import { UnitDetails } from './UnitDetails'
import { UnitListing } from './UnitListing'
import * as config from './config'

export interface Props {
  token: string
}

function parseDeadline (str: string): Date {
  const parts = str.split('-', 3).map(p => parseInt(p, 10))
  if (parts.length !== 3 || parts.some(p => !Number.isSafeInteger(p))) { throw new Error('Invalid date') }
  return new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], 20))
}

export function Dashboard (props: Props): JSX.Element {
  const [student, setStudent] = useState<Student | undefined>(undefined)
  const [units, setUnits] = useState<Unit[] | undefined>(undefined)
  const [selectedUnit, setSelectedUnit] = useState(-1)
  const [error, setError] = useState(false)

  useEffect(() => {
    const fetchStudent = async (): Promise<void> => {
      const res = await fetch(`${config.apiEndpoint}students/me`, {
        headers: {
          Authorization: `Bearer ${props.token}`
        }
      })
      const json = await res.json()
      if (typeof json !== 'object' ||
                typeof json.id !== 'number' || !Number.isSafeInteger(json.id) ||
                typeof json.username !== 'string' ||
                typeof json.fullName !== 'string' ||
                typeof json.groupA !== 'boolean') {
        throw new Error('Invalid student format')
      }
      setStudent(json as Student)
    }
    fetchStudent().catch(err => {
      console.error('Failed to fetch student', err)
      setError(true)
    })
  }, [props.token])

  useEffect(() => {
    const fetchUnits = async (): Promise<void> => {
      const res = await fetch(`${config.apiEndpoint}units`, {
        headers: {
          Authorization: `Bearer ${props.token}`
        }
      })
      const json = await res.json()
      if (!Array.isArray(json)) { throw new Error('Invalid fetch units response') }
      const units: Unit[] = json.map(u => {
        if (typeof u.id !== 'number' ||
                        typeof u.name !== 'string' ||
                        typeof u.exerciseCount !== 'number' ||
                        typeof u.deadlineA !== 'string' ||
                        typeof u.deadlineB !== 'string') {
          throw new Error('Invalid unit format')
        }
        return {
          id: u.id,
          name: u.name,
          exerciseCount: u.exerciseCount,
          deadlineA: parseDeadline(u.deadlineA),
          deadlineB: parseDeadline(u.deadlineB)
        }
      })
      setUnits(units)
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
