import { Fragment, JSX, ComponentChildren } from 'preact'

import * as config from './config'
import * as net from './net'
import { Thumbnail } from './Thumbnail'

export interface Props {
  exercise: net.Exercise
  exerciseIndex: number
  children: ComponentChildren
  onClickCorrectionPictureDelete?: (digest: string) => void
}

function renderStudentInline (s: net.Student): JSX.Element {
  const group = s.groupA ? 'pair' : 'impair'
  return <li>{s.fullName} (groupe {group})</li>
}

export function ExerciseCard (props: Props): JSX.Element {
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
            <Thumbnail
              key={i}
              src={`${config.correctionsEndpoint}${d}.png`}
              alt='Correction exercice'
              onClickDelete={() => {
                if (props.onClickCorrectionPictureDelete !== undefined) { props.onClickCorrectionPictureDelete(d) }
              }}
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
        {props.children}
      </div>
    </div>
  )
}
