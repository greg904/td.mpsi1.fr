import { Fragment, h, JSX } from 'preact'
import { useState } from 'preact/hooks'

import * as net from './net'

export interface Props {
  token: string
  student: net.Student
  unitId: number
  exercise: net.Exercise
  exerciseIndex: number
  groupA: boolean
  onUpdate: (newExercise: net.Exercise) => void
}

function renderStudentInline (s: net.Student): JSX.Element {
  const group = s.groupA ? 'pair' : 'impair'
  return <li>{s.fullName} (groupe {group})</li>
}

export function ExerciseCard (props: Props): JSX.Element {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  let blockedText = null
  if (props.exercise.blocked) {
    blockedText = (
      <Fragment>
        <h6 class='mb-2 text-muted'>Ne pas faire</h6>
        <p>Cet exercice à été marqué comme "à ne pas faire" par quelqu'un.</p>
      </Fragment>
    )
  }

  const correctedGroups = []
  if (props.exercise.correctedA) { correctedGroups.push('pair') }
  if (props.exercise.correctedB) { correctedGroups.push('impair') }

  let correctedText = null
  if (correctedGroups.length !== 0) {
    correctedText = (
      <Fragment>
        <h6 class='mb-2 text-muted'>Corrigé par Mr. Pernette</h6>
        <ul>{correctedGroups.map((g, i) => <li key={i}>Pour le groupe {g}</li>)}</ul>
      </Fragment>
    )
  }

  let correctionPictures = null
  if (props.exercise.correctionDigests.length !== 0) {
    correctionPictures = (
      <Fragment>
        <h6 class='mb-2 text-muted'>Correction</h6>
        {props.exercise.correctionDigests.map((d, i) => {
          return (
            <img
              key={i}
              src={`https://td-corr.mpsi1.fr/${d}.png`}
              class='img-fluid d-block rounded mx-auto mb-2'
            />
          )
        })}
      </Fragment>
    )
  }

  let reservedText = null
  if (props.exercise.reservedBy.length !== 0) {
    reservedText = (
      <Fragment>
        <h6 class='mb-2 text-muted'>Réservé par</h6>
        <ul>{props.exercise.reservedBy.map(renderStudentInline)}</ul>
      </Fragment>
    )
  }

  let presentedText = null
  if (props.exercise.presentedBy.length !== 0) {
    presentedText = (
      <Fragment>
        <h6 class='mb-2 text-muted'>Déjà présenté par</h6>
        <ul>{props.exercise.presentedBy.map(renderStudentInline)}</ul>
      </Fragment>
    )
  }

  let errorDiv = null
  if (error) {
    errorDiv = (
      <div class='alert alert-danger mb-3' role='alert'>
        Une erreur est survenue lors du changement.
      </div>
    )
  }

  const setExerciseState = async (state: string, cb: () => void): Promise<void> => {
    setLoading(true)

    try {
      await net.modifyExercise(props.token, props.unitId, props.exerciseIndex, 'state', state)

      cb()
      setLoading(false)
    } catch (err) {
      console.error('Failed to set exercise state', err)
      setError(true)
      setLoading(false)
    }
  }

  const setExerciseCorrected = async (corrected: boolean): Promise<void> => {
    setLoading(true)

    try {
      await net.modifyExercise(props.token, props.unitId, props.exerciseIndex, 'corrected', corrected)

      const newExercise = Object.assign({}, props.exercise)
      if (props.groupA) {
        newExercise.correctedA = corrected
      } else {
        newExercise.correctedB = corrected
      }
      props.onUpdate(newExercise)

      setLoading(false)
    } catch (err) {
      console.error('Failed to set exercise corrected state', err)
      setError(true)
      setLoading(false)
    }
  }

  const setExerciseBlocked = async (blocked: boolean): Promise<void> => {
    setLoading(true)

    try {
      await net.modifyExercise(props.token, props.unitId, props.exerciseIndex, 'blocked', blocked)

      const newExercise = Object.assign({}, props.exercise)
      newExercise.blocked = blocked
      props.onUpdate(newExercise)

      setLoading(false)
    } catch (err) {
      console.error('Failed to set exercise blocked state', err)
      setError(true)
      setLoading(false)
    }
  }

  let mainButtons = null
  let resetButton = null
  if (!props.exercise.presentedBy.some(s => s.id === props.student.id)) {
    if (props.exercise.reservedBy.some(s => s.id === props.student.id)) {
      const onClickCancel = (): void => {
        setExerciseState('none', () => {
          const newExercise = Object.assign({}, props.exercise)
          newExercise.reservedBy = newExercise.reservedBy.filter(s => s.id !== props.student.id)
          props.onUpdate(newExercise)
        }).catch(() => {})
      }
      const onClickPresented = (): void => {
        setExerciseState('presented', () => {
          const newExercise = Object.assign({}, props.exercise)
          newExercise.reservedBy = newExercise.reservedBy.filter(s => s.id !== props.student.id)
          newExercise.presentedBy = [...newExercise.presentedBy, props.student]
          props.onUpdate(newExercise)
        }).catch(() => {})
      }

      mainButtons = (
        <Fragment>
          <button
            type='button'
            class='btn btn-danger mb-1 me-1'
            onClick={onClickCancel}
            disabled={loading}
          >
            Annuler la réservation
          </button>
          <button
            type='button'
            class='btn btn-success mb-1 me-1'
            onClick={onClickPresented}
            disabled={loading}
          >
            J'ai présenté l'exercice
          </button>
        </Fragment>
      )
    } else {
      const onClickReserve = (): void => {
        setExerciseState('reserved', () => {
          const newExercise = Object.assign({}, props.exercise)
          newExercise.reservedBy = [...newExercise.reservedBy, props.student]
          props.onUpdate(newExercise)
        }).catch(() => {})
      }

      mainButtons = (
        <button
          type='button'
          class='btn btn-primary'
          onClick={onClickReserve}
          disabled={loading}
        >
          Réserver
        </button>
      )
    }
  } else {
    const onClickReset = (e: MouseEvent): void => {
      e.preventDefault()
      setExerciseState('none', () => {
        const newExercise = Object.assign({}, props.exercise)
        newExercise.presentedBy = newExercise.presentedBy.filter(s => s.id !== props.student.id)
        props.onUpdate(newExercise)
      }).catch(() => {})
    }
    resetButton = <li><a class='dropdown-item' href='#' onClick={onClickReset}>Marquer comme non présenté</a></li>
  }

  let loader = null
  if (loading) {
    loader = (
      <div class='spinner-border' role='status'>
        <span class='visually-hidden'>Chargement...</span>
      </div>
    )
  }

  const correctedForMyGroup = props.groupA
    ? props.exercise.correctedA
    : props.exercise.correctedB

  const onClickMarkCorrected = (e: MouseEvent): void => {
    e.preventDefault()
    setExerciseCorrected(!correctedForMyGroup).catch(() => {})
  }

  const onClickMarkBlocked = (e: MouseEvent): void => {
    e.preventDefault()
    setExerciseBlocked(!props.exercise.blocked).catch(() => {})
  }

  return (
    <div class='card'>
      <div class='card-body'>
        <h5 class='card-title'>Exercice {props.exerciseIndex + 1}</h5>
        <p class='card-text'>
          {blockedText}
          {correctedText}
          {correctionPictures}
          {reservedText}
          {presentedText}
        </p>
        <div class={loading ? 'pb-3' : ''}>
          {errorDiv}
          {mainButtons}
          <div class='dropdown float-end'>
            <button class='btn btn-secondary dropdown-toggle' type='button' data-bs-toggle='dropdown' aria-expanded='false'>
              Plus d'options
            </button>
            <ul class='dropdown-menu'>
              {resetButton}
              <li><a class='dropdown-item' href='#' onClick={onClickMarkBlocked}>Marquer comme {props.exercise.blocked ? 'non ' : ''}"à ne pas faire"</a></li>
              <li><a class='dropdown-item' href='#' onClick={onClickMarkCorrected}>Marquer comme {correctedForMyGroup ? 'non ' : ''}corrigé par Mr. Pernette</a></li>
            </ul>
          </div>
        </div>
        {loader}
      </div>
    </div>
  )
}
