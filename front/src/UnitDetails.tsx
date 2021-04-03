import { JSX } from 'preact'
import { useEffect, useState } from 'preact/hooks'
import Masonry from 'react-masonry-css'

import { ExerciseCard } from './ExerciseCard'
import { Loader } from './Loader'
import * as net from './net'
import * as config from './config'

export interface UnitDetailsProps {
  unitId: number
  authToken: string
  studentId: number
  studentInGroupEven: boolean
  onInvalidAuthToken?: () => void
}

export function UnitDetails (props: UnitDetailsProps): JSX.Element {
  const [exercisesWithPendingAction, setExercisesWithPendingAction] = useState<number[]>([])

  // This is a hack to force a refresh of the data.
  const [counter, setCounter] = useState(0)
  const forceUpdate = (): void => {
    setCounter(c => c + 1)
  }

  const [exercises, setExercises] = useState<net.Exercise[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    net.fetchExercisesInUnit(props.authToken, props.unitId)
      .then(exercises => {
        setExercises(exercises)
        setExercisesWithPendingAction([])
      })
      .catch(err => {
        console.error('Failed to fetch exercises', err)
        if (props.onInvalidAuthToken !== undefined) { props.onInvalidAuthToken() }
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
    const doUpdate = (makePromise: () => Promise<void>): void => {
      if (exercisesWithPendingAction.length !== 0) { return }
      setExercisesWithPendingAction(indices => [...indices, i])
      makePromise()
        .then(forceUpdate)
        .catch(err => {
          console.error('Failed update exercise:', err)
          setError(true)
        })
    }

    return (
      <ExerciseCard
        key={i}
        unitId={props.unitId}
        exerciseIndex={i}
        correctionImages={e.correctionImages}
        presentedBy={e.presentedBy}
        reservedBy={e.reservedBy}
        teacherCorrectedForGroupEven={e.teacherCorrectedForGroupEven}
        teacherCorrectedForGroupOdd={e.teacherCorrectedForGroupOdd}
        blocked={e.blocked}
        studentId={props.studentId}
        studentInGroupEven={props.studentInGroupEven}
        actionPending={exercisesWithPendingAction.includes(i)}
        onReserve={() => {
          doUpdate(async () => await net.patchExercise(props.authToken, props.unitId, i, { stateForMe: 'reserved' }))
        }}
        onMarkPresented={() => {
          doUpdate(async () => await net.patchExercise(props.authToken, props.unitId, i, { stateForMe: 'presented' }))
        }}
        onReset={() => {
          doUpdate(async () => await net.patchExercise(props.authToken, props.unitId, i, { stateForMe: 'none' }))
        }}
        onSetBlocked={blocked => {
          doUpdate(async () => await net.patchExercise(props.authToken, props.unitId, i, { blocked }))
        }}
        onSetCorrectedByTeacher={corrected => {
          doUpdate(async () => await net.patchExercise(props.authToken, props.unitId, i, { teacherCorrectedForMyGroup: corrected }))
        }}
        onClickCorrectionPictureDelete={digest => {
          doUpdate(async () => await net.deleteExerciseCorrection(props.authToken, props.unitId, i, digest))
        }}
      />
    )
  })

  return (
    <Masonry
      breakpointCols={config.pageGridColumns}
      className='exercise-grid'
      columnClassName='exercise-grid__column'
    >
      {exerciseDivs}
    </Masonry>
  )
}
