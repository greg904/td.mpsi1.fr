import { Fragment, JSX } from 'preact'
import { useEffect, useState } from 'preact/hooks'
import { Link } from 'react-router-dom'

import { ExerciseCard } from './ExerciseCard'
import Loader from './Loader'
import * as net from './net'

export interface UnitDetailsProps {
  unitId: number
  authToken: string
  groupA: boolean
}

export function UnitDetails (props: UnitDetailsProps): JSX.Element {
  // This is a hack to force a refresh of the data.
  const [counter, setCounter] = useState(0)
  const forceUpdate = (): void => setCounter(c => c + 1)

  const [exercises, setExercises] = useState<net.Exercise[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    net.fetchExercisesInUnit(props.authToken, props.unitId)
      .then(setExercises)
      .catch(err => {
        console.error('Failed to fetch exercises', err)
        setError(true)
      })
  }, [props.authToken, props.unitId, counter])

  if (error) {
    return (
      <div class='alert alert-danger' role='alert'>
        Une erreur est survenue lors du chargement du chapitre.
      </div>
    )
  }

  if (exercises === null) {
    return <Loader />
  }

  const exerciseDivs = exercises.map((e, i) => {
    const first = i === 0

    return (
      <div key={i} class={first ? undefined : 'pt-3'}>
        <ExerciseCard
          exercise={e}
          exerciseIndex={i}
        >
          <button
            type='button'
            class='btn btn-primary mb-1 me-1'
            onClick={() => {
              net.modifyExercise(props.authToken, props.unitId, i, 'state', 'reserved')
                .then(forceUpdate)
                .catch(err => {
                  console.error('Failed to reserve exercise:', err)
                  setError(true)
                })
            }}
          >
            Réserver
          </button>
          <button
            type='button'
            class='btn btn-success mb-1 me-1'
            onClick={() => {
              net.modifyExercise(props.authToken, props.unitId, i, 'state', 'presented')
                .then(forceUpdate)
                .catch(err => {
                  console.error('Failed to set exercise as presented:', err)
                  setError(true)
                })
            }}
          >
            J'ai présenté l'exercice
          </button>
          <button
            type='button'
            class='btn btn-danger mb-1 me-1'
            onClick={() => {
              net.modifyExercise(props.authToken, props.unitId, i, 'state', 'none')
                .then(forceUpdate)
                .catch(err => {
                  console.error('Failed to reset exercise:', err)
                  setError(true)
                })
            }}
          >
            Réinitialiser
          </button>
          <button
            type='button'
            class='btn btn-secondary mb-1 me-1'
            onClick={() => {
              net.modifyExercise(props.authToken, props.unitId, i, 'blocked', !e.blocked)
                .then(forceUpdate)
                .catch(err => {
                  console.error('Failed to toggle blocked state for exercise:', err)
                  setError(true)
                })
            }}
          >
            Changer état bloqué
          </button>
          <button
            type='button'
            class='btn btn-secondary mb-1 me-1'
            onClick={() => {
              net.modifyExercise(props.authToken, props.unitId, i, 'corrected', props.groupA ? !e.correctedA : !e.correctedB)
                .then(forceUpdate)
                .catch(err => {
                  console.error('Failed to toggle corrected state for exercise:', err)
                  setError(true)
                })
            }}
          >
            Marquer comme corrigé
          </button>
          <Link
            className='btn btn-secondary mb-1 me-1'
            to={`/chapitres/${props.unitId}/exercices/${i}/ajouter-correction`}
          >
            Ajouter une photo de correction
          </Link>
        </ExerciseCard>
      </div>
    )
  })

  return (
    <Fragment>
      {exerciseDivs}
    </Fragment>
  )
}
