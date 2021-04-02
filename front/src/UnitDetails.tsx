import { Fragment, h, JSX } from 'preact'
import { useEffect, useState } from 'preact/hooks'

import Exercise from './Exercise'
import { ExerciseCard } from './ExerciseCard'
import Student from './Student'
import Unit from './Unit'
import * as config from './config'

export interface Props {
  token: string
  student: Student
  unit: Unit
  groupA: boolean
}

export function UnitDetails (props: Props): JSX.Element {
  const [exercises, setExercises] = useState<Exercise[] | undefined>(undefined)
  const [error, setError] = useState(false)

  useEffect(() => {
    const fetchExercises = async (): Promise<void> => {
      const res = await fetch(`${config.apiEndpoint}units/${props.unit.id}/exercises`, {
        headers: {
          Authorization: `Bearer ${props.token}`
        }
      })
      const json = await res.json()
      if (!Array.isArray(json)) { throw new Error('Invalid unit exercise list response') }
      // TODO: validate
      setExercises(json as Exercise[])
    }
    fetchExercises()
      .catch(err => {
        console.error('Failed to fetch exercises', err)
        setError(true)
      })
  }, [props.token, props.unit.id])

  if (error) {
    return (
      <div class='alert alert-danger' role='alert'>
        Une erreur est survenue.
      </div>
    )
  }

  if (exercises === undefined) {
    return (
      <div class='spinner-border' role='status'>
        <span class='visually-hidden'>Chargement...</span>
      </div>
    )
  }

  return (
    <Fragment>
      {exercises.map((e, i) => {
        const last = i === exercises.length - 1

        const onUpdate = (newExercise: Exercise): void => {
          setExercises(old => {
            if (old === undefined) { return undefined }
            const tmp = [...old]
            tmp[i] = newExercise
            return tmp
          })
        }

        return (
          <div key={i} class={last ? '' : 'pb-3'}>
            <ExerciseCard
              token={props.token}
              student={props.student}
              unitId={props.unit.id}
              exercise={e}
              exerciseIndex={i}
              groupA={props.groupA}
              onUpdate={onUpdate}
            />
          </div>
        )
      })}
    </Fragment>
  )
}
