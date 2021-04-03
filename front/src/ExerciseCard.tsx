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
  teacherCorrectedForGroupEven: boolean
  teacherCorrectedForGroupOdd: boolean
  blocked: boolean
  studentId: number
  studentInGroupEven: boolean
  actionPending: boolean
  onReserve?: () => void
  onMarkPresented?: () => void
  onReset?: () => void
  onSetBlocked?: (blocked: boolean) => void
  onSetCorrectedByTeacher?: (corrected: boolean) => void
  onClickCorrectionPictureDelete?: (digest: string) => void
}

function renderStudent (s: net.Student): string {
  const group = s.inGroupEven ? 'pair' : 'impair'
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

  if (props.teacherCorrectedForGroupEven || props.teacherCorrectedForGroupOdd) {
    let group
    if (props.teacherCorrectedForGroupEven && props.teacherCorrectedForGroupOdd) {
      group = <><strong>pair</strong> et <strong>impair</strong></>
    } else if (props.teacherCorrectedForGroupEven) {
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

  let correctionPictures = null
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

  let mainButton = null
  const additionalDropdownItems = []
  if (props.presentedBy.some(s => s.id === props.studentId)) {
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
          Réinitialiser
        </a>
      </li>
    )
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
        Valider mon passage
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
  }

  const correctedInMyGroup = props.studentInGroupEven
    ? props.teacherCorrectedForGroupEven
    : props.teacherCorrectedForGroupOdd

  return (
    <div class={`exercise-card exercise-card--${status} card`}>
      <div class='card-body'>
        <div class='mb-3'>
          <h5 class='exercise-card__title card-title float-start me-3'>
            <span class='d-sm-none'>#</span>
            <span class='d-none d-sm-inline'>Exercice </span>
            {props.exerciseIndex + 1}
          </h5>
          <div class='btn-toolbar float-end'>
            {mainButton}
            <div class='dropdown ms-1'>
              <button
                type='button'
                class='btn btn-dark dropdown-toggle'
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
                    Ajouter la correction (jpg, png)
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
        </div>
        {correctionPictures}
      </div>
      {statusEl}
    </div>
  )
}
