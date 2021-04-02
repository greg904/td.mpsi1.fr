import { useRef } from 'preact/hooks'
import { useHistory, useParams } from 'react-router'
import { Link } from 'react-router-dom'

import * as net from './net'

export interface UploadCorrectionPageProps {
  authToken: string
}

export function UploadCorrectionPage (props: UploadCorrectionPageProps): JSX.Element {
  const { unitId: unitIdStr, exerciseIndex: exerciseIndexStr }: { unitId: string, exerciseIndex: string } = useParams()
  const unitId = parseInt(unitIdStr)
  const exerciseIndex = parseInt(exerciseIndexStr)

  const history = useHistory()
  const backUrl = `/chapitres/${unitId}`
  const goBack = (): void => history.push(backUrl)

  const fileInput = useRef<HTMLInputElement>(null)

  const onSubmit = (e: Event): void => {
    e.preventDefault()

    if (fileInput.current === null) { return }

    const files = fileInput.current.files as FileList
    const promises = []
    for (let i = 0; i < files.length; i++) {
      const file = files.item(i)
      if (file !== null) { promises.push(net.submitExerciseCorrection(props.authToken, unitId, exerciseIndex, file)) }
    }

    Promise.all(promises)
      .then(goBack)
      .catch(err => {
        console.error('Failed to upload correction:', err)
      })
  }

  return (
    <form onSubmit={onSubmit}>
      <div class='mb-3'>
        <label for='formFile' class='form-label'>Photo à téléverser</label>
        <input ref={fileInput} class='form-control' type='file' name='file' />
      </div>
      <div class='mb-3'>
        <button type='submit' class='btn btn-primary mb-1 me-1'>Téléverser</button>
        <Link className='btn btn-secondary mb-1 me-1' to={backUrl}>Annuler</Link>
      </div>
    </form>
  )
}
