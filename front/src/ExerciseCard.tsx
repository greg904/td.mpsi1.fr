import { JSX } from 'preact'
import Masonry from 'react-masonry-css'

import * as net from './net'
import * as config from './config'
import { DeletableImage } from './DeletableImage'
import { Loader } from './Loader'
import { Link } from 'react-router-dom'

export interface Props {
  unitId: number
  exerciseIndex: number
  correctionImages: string[]
  reservedBy: net.Student[]
  presentedBy: net.Student[]
  correctedInEvenGroup: boolean
  correctedInOddGroup: boolean
  blocked: boolean
  studentId: number
  studentInEvenGroup: boolean
  actionPending: boolean
  onReserve?: () => void
  onMarkPresented?: () => void
  onReset?: () => void
  onSetBlocked?: (blocked: boolean) => void
  onSetCorrectedByTeacher?: (corrected: boolean) => void
  onClickCorrectionPictureDelete?: (digest: string) => void
}

function renderStudent (s: net.Student): string {
  const group = s.groupA ? 'pair' : 'impair'
  return `${s.fullName} (groupe ${group})`
}

function renderStudentList (students: net.Student[]): string {
  const names = students.map(renderStudent)
  if (names.length === 1) {
    return names[0]
  } else if (names.length === 2) {
    return `${names[0]} et ${names[1]}`
  }
  return `${names.slice(0, -1).join(', ')} et ${names[names.length - 1]}`
}

export function ExerciseCard (props: Props): JSX.Element {
  const dlEls = []
  const statusEls = []
  let status = 'normal'

  if (props.reservedBy.length !== 0) {
    dlEls.push(
      <>
        <dt>Réservé par</dt>
        <dd>{renderStudentList(props.reservedBy)}</dd>
      </>
    )
    status = 'reserved'
  }

  if (props.presentedBy.length !== 0) {
    dlEls.push(
      <>
        <dt>Présenté par</dt>
        <dd>{renderStudentList(props.presentedBy)}</dd>
      </>
    )
    status = 'presented'
  }

  if (props.correctedInEvenGroup || props.correctedInOddGroup) {
    let group
    if (props.correctedInEvenGroup && props.correctedInOddGroup) {
      group = <><strong>pair</strong> et <strong>impair</strong></>
    } else if (props.correctedInEvenGroup) {
      group = <strong>pair</strong>
    } else {
      group = <strong>impair</strong>
    }

    statusEls.push(
      <li class='list-group-item'>
        Corrigé par Mr. Pernette pour le groupe {group}
      </li>
    )
    status = 'presented'
  }

  if (props.blocked) {
    statusEls.push(
      <li class='list-group-item'>
        Il ne faut pas faire cet exercice.
      </li>
    )
    status = 'blocked'
  }

  let correctionPictures
  if (props.correctionImages.length !== 0) {
    correctionPictures = (
      <Masonry
        breakpointCols={2}
        className='exercise-card__correction-grid'
        columnClassName='exercise-card__correction-column'
      >
        {props.correctionImages.map((d, i) => {
          return (
            <DeletableImage
              key={i}
              class='exercise-card__correction-image'
              src={`${config.correctionsEndpoint}${d}.png`}
              alt='Correction exercice'
              onClickDelete={() => {
                if (props.onClickCorrectionPictureDelete !== undefined) { props.onClickCorrectionPictureDelete(d) }
              }}
            />
          )
        })}
      </Masonry>
    )
  } else {
    correctionPictures = (
      <p class='card-text text-muted'>
        (aucune correction)
      </p>
    )
  }

  if (dlEls.length !== 0) {
    statusEls.push(
      <li class='list-group-item'>
        <div class='exercise-card__margin-hack'>
          {dlEls}
        </div>
      </li>
    )
  }

  // The most important messages were added last, in order to overwrite
  // variables like the status.
  statusEls.reverse()

  let statusEl = null
  if (statusEls.length !== 0) {
    statusEl = (
      <ul class='list-group list-group-flush'>
        {statusEls}
      </ul>
    )
  }

  let mainButtonLoader = null
  if (props.actionPending) {
    mainButtonLoader = (
      <span class='me-2'>
        <Loader small />
      </span>
    )
  }

  let mainButton
  let dropdownButtonColor
  const additionalDropdownItems = []
  if (props.presentedBy.some(s => s.id === props.studentId)) {
    mainButton = (
      <button
        type='button'
        class='btn btn-danger'
        disabled={props.actionPending}
        onClick={() => {
          if (props.onReset !== undefined) { props.onReset() }
        }}
      >
        {mainButtonLoader}
        Réinitialiser
      </button>
    )
    dropdownButtonColor = 'danger'
  } else if (props.reservedBy.some(s => s.id === props.studentId)) {
    mainButton = (
      <button
        type='button'
        class='btn btn-success'
        disabled={props.actionPending}
        onClick={() => {
          if (props.onMarkPresented !== undefined) { props.onMarkPresented() }
        }}
      >
        {mainButtonLoader}
        Je l'ai présenté
      </button>
    )
    additionalDropdownItems.push(
      <li>
        <a
          class='dropdown-item'
          href='#'
          onClick={e => {
            e.preventDefault()
            if (props.onReset !== undefined) { props.onReset() }
          }}
        >
          Annuler ma réservation
        </a>
      </li>
    )
    dropdownButtonColor = 'success'
  } else {
    mainButton = (
      <button
        type='button'
        class='btn btn-primary'
        disabled={props.actionPending}
        onClick={() => {
          if (props.onReserve !== undefined) { props.onReserve() }
        }}
      >
        {mainButtonLoader}
        Réserver
      </button>
    )
    dropdownButtonColor = 'primary'
  }

  const correctedInMyGroup = props.studentInEvenGroup
    ? props.correctedInEvenGroup
    : props.correctedInOddGroup

  return (
    <div class={`exercise-card exercise-card--${status} card`}>
      <div class='card-body'>
        <div class='d-flex justify-content-between align-items-start mb-3'>
          <h5 class='card-title'>
            Exercice {props.exerciseIndex + 1}
          </h5>
          <div class='btn-group'>
            {mainButton}
            <button
              type='button'
              class={`btn btn-${dropdownButtonColor} dropdown-toggle`}
              data-bs-toggle='dropdown'
              aria-expanded='false'
              disabled={props.actionPending}
            />
            <ul class='dropdown-menu'>
              {additionalDropdownItems}
              <li>
                <Link
                  className='dropdown-item'
                  to={`/chapitres/${props.unitId}/exercices/${props.exerciseIndex + 1}/corrections/ajouter`}
                >
                  Ajouter la correction
                </Link>
              </li>
              <li>
                <a
                  class='dropdown-item'
                  href='#'
                  onClick={e => {
                    e.preventDefault()
                    if (props.onSetBlocked !== undefined) { props.onSetBlocked(!props.blocked) }
                  }}
                >
                  {props.blocked ? 'On peut faire cet exercice' : 'Il ne faut pas faire cet exercice'}
                </a>
              </li>
              <li>
                <a
                  class='dropdown-item'
                  href='#'
                  onClick={e => {
                    e.preventDefault()
                    if (props.onSetCorrectedByTeacher != null) { props.onSetCorrectedByTeacher(!correctedInMyGroup) }
                  }}
                >
                  {correctedInMyGroup ? 'Mr. Pernette n\'a pas corrigé cet exercice' : 'Mr. Pernette a corrigé cet exercice'}
                </a>
              </li>
            </ul>
          </div>
        </div>
        {correctionPictures}
      </div>
      {statusEl}
    </div>
  )
}
