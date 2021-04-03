import { useState } from 'preact/hooks'
import { useHistory } from 'react-router'
import { Link } from 'react-router-dom'
import Loader from './Loader'

import * as net from './net'

export interface UploadCorrectionFormProps {
  authToken: string
  unitId: number
  exerciseIndex: number
  onInvalidAuthToken?: () => void
}

interface UploadProgress {
  done: number
  total: number
}

export function UploadCorrectionForm (props: UploadCorrectionFormProps): JSX.Element {
  const [hasSelectedFiles, setHasSelectedFiles] = useState(false)
  const [progress, setProgress] = useState<UploadProgress | null>(null)
  const [error, setError] = useState<string | null>(null)

  const history = useHistory()
  const backUrl = `/chapitres/${props.unitId}`

  const onSubmit = (e: Event): void => {
    e.preventDefault()

    if (!hasSelectedFiles) {
      return
    }

    const fileInput = document.getElementById('file-input') as HTMLInputElement

    const files = fileInput.files as FileList
    const promises = []
    for (let i = 0; i < files.length; i++) {
      const file = files.item(i)
      if (file !== null) {
        promises.push(net.submitExerciseCorrection(props.authToken, props.unitId, props.exerciseIndex, file)
          .then(() => {})
          .catch(err => {
            console.error('Failed to upload correction:', err)
            if (err instanceof net.InvalidAuthTokenError) {
              if (props.onInvalidAuthToken !== undefined) { props.onInvalidAuthToken() }
            } else if (err instanceof net.BadRequestError) {
              setError('Le format d\'une des photos est invalide.')
            } else if (err instanceof net.PayloadTooLargeError) {
              setError('Une des photos est trop lourde.')
            } else if (err instanceof net.ConflictError) {
              // The same photo was already uploaded. This is fine.
              return
            } else {
              setError('Une erreur est survenue lors du téléversement.')
            }
            return err
          })
          .finally(() => setProgress(p => {
            if (p === null) { return null }
            return { ...p, done: p.done + 1 }
          })))
      }
    }

    setProgress({ done: 0, total: promises.length })

    Promise.all(promises)
      .then(errs => {
        const success = errs.every(e => e === undefined)
        if (success) { history.push(backUrl) }
      })
      .finally(() => setProgress(null))
  }

  let errorDiv = null
  if (error !== null) {
    errorDiv = (
      <div class='alert alert-danger' role='alert'>
        {error}
      </div>
    )
  }

  let loader = null
  let progressParagraph = null
  if (progress !== null) {
    loader = (
      <span class='me-2'>
        <Loader small />
      </span>
    )
    progressParagraph = (
      <p>
        <strong>{progress.done}</strong>/<strong>{progress.total}</strong> photo(s) téléversée(s)
      </p>
    )
  }

  return (
    <>
      <p class='lead'>
        Téléversez une ou plusieurs photos avec la correction de l'exercice afin
        que les autres élèves puissent la regarder après le TD.<br />
        Chaque photo ne doit pas peser plus de <strong>5 Mio</strong>.
      </p>
      {errorDiv}
      <form onSubmit={onSubmit}>
        <div class='mb-3'>
          <label for='file-input' class='form-label'>Photo(s) avec la correction</label>
          <input
            id='file-input'
            class='form-control'
            type='file'
            name='file'
            multiple
            onChange={e => {
              const input = e.target as HTMLInputElement
              // User can only submit if at least one file was selected.
              setHasSelectedFiles((input.files as FileList).length !== 0)
            }}
          />
        </div>
        <div class={progress === null ? undefined : 'mb-3'}>
          <button
            type='submit'
            class='btn btn-primary mb-1 me-1'
            disabled={progress !== null || !hasSelectedFiles}
          >
            {loader}
            Ajouter
          </button>
          <Link className='btn btn-secondary mb-1 me-1' to={backUrl}>Annuler</Link>
        </div>
        {progressParagraph}
      </form>
    </>
  )
}
