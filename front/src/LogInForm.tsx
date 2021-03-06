import { JSX } from 'preact'
import { useState } from 'preact/hooks'
import { Loader } from './Loader'

import * as net from './net'

enum Alert {
  None,
  InvalidCreds,
  Error,
}

export interface LogInFormProps {
  onSuccess: (authToken: string) => void
}

export function LogInForm (props: LogInFormProps): JSX.Element {
  const [loading, setLoading] = useState(false)
  const [alert, setAlert] = useState<Alert>(Alert.None)
  const [wasValidated, setWasValidated] = useState<boolean>(false)

  let errorDiv = null
  if (alert !== Alert.None) {
    let text
    switch (alert) {
      case Alert.InvalidCreds:
        text = 'Identifiants invalides.'
        break
      case Alert.Error:
        text = 'Une erreur est survenue.'
        break
    }

    errorDiv = (
      <div class='alert alert-danger' role='alert'>
        {text}
      </div>
    )
  }

  const onSubmit = (e: Event): void => {
    e.preventDefault()

    const form = e.target as HTMLFormElement
    if (!form.reportValidity()) {
      setWasValidated(true)
      return
    }
    setWasValidated(false)

    const formData = new FormData(form)
    const lastName = formData.get('last-name') as string
    const password = formData.get('password') as string

    const username = lastName
      .replace(/\W+/, '-')
      .toLowerCase()

    setLoading(true)

    net.logIn(username, password)
      .then(authToken => {
        if (authToken === null) {
          setAlert(Alert.InvalidCreds)
        } else {
          props.onSuccess(authToken)
        }
      })
      .catch(err => {
        console.error('Error while trying to log in.', err)
        setAlert(Alert.Error)
      })
      .finally(() => {
        setLoading(false)
      })
  }

  let buttonLoader = null
  if (loading) {
    buttonLoader = (
      <span class='me-2'>
        <Loader small />
      </span>
    )
  }

  return (
    <>
      <p className='lead'>
        Connectez vous pour pouvoir accéder aux exercices.
      </p>
      {errorDiv}
      <form class={wasValidated ? 'was-validated' : ''} onSubmit={onSubmit} noValidate>
        <div class='mb-3'>
          <label for='last-name' class='form-label'>Nom de famille</label>
          <input type='text' class='form-control' id='last-name' name='last-name' placeholder='Dupont' required />
          <div class='invalid-feedback'>Veuillez remplir ce champ.</div>
        </div>
        <div class='mb-3'>
          <label for='password' class='form-label'>Mot de passe</label>
          <input type='password' class='form-control' id='password' name='password' required />
          <div class='invalid-feedback'>Veuillez remplir ce champ.</div>
        </div>
        <button type='submit' class='btn btn-primary' disabled={loading}>
          {buttonLoader}
          Se connecter
        </button>
      </form>
    </>
  )
}
