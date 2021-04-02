import { h, JSX } from 'preact'
import { useState } from 'preact/hooks'

import * as net from './net'

enum Alert {
  None,
  InvalidCreds,
  Error,
}

export interface LogInFormProps {
  onSuccess: (userToken: string) => void
}

export function LogInForm (props: LogInFormProps): JSX.Element {
  const [loading, setLoading] = useState(false)
  const [alert, setAlert] = useState<Alert>(Alert.None)
  const [wasValidated, setWasValidated] = useState<boolean>(false)

  let loader = null
  if (loading) {
    loader = (
      <div class='spinner-border' role='status'>
        <span class='visually-hidden'>Chargement...</span>
      </div>
    )
  }

  let alertDiv = null
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

    alertDiv = (
      <div class='alert alert-danger' role='alert'>
        {text}
      </div>
    )
  }

  const doLogIn = async (username: string, password: string): Promise<void> => {
    setLoading(true)

    try {
      const userToken = await net.logIn(username, password)
      if (userToken === null) {
        setAlert(Alert.InvalidCreds)
        setLoading(false)
      } else {
        props.onSuccess(userToken)
      }
    } catch (err) {
      console.error('Error while trying to log in.', err)
      setAlert(Alert.Error)
      setLoading(false)
    }
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
    doLogIn(username, password).catch(() => {})
  }

  return (
    <form class={wasValidated ? 'was-validated' : ''} onSubmit={onSubmit} noValidate>
      {alertDiv}
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
      <div class={loading ? 'mb-3' : ''}>
        <button type='submit' class='btn btn-primary' disabled={loading}>Se connecter</button>
      </div>
      {loader}
    </form>
  )
}
