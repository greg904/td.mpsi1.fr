import 'bootstrap'
import 'bootstrap/dist/css/bootstrap.css' // Import precompiled Bootstrap css

import { render, h, JSX } from 'preact'
import { useState } from 'preact/hooks'
import { Dashboard } from './Dashboard'
import { LogInForm } from './LogInForm'

function App (): JSX.Element {
  const [token, setToken] = useState<string | undefined>(() => {
    const tmp = localStorage.getItem('token')
    return tmp === null ? undefined : tmp
  })
  if (token !== undefined) { return <Dashboard token={token} /> }

  const onLoginSuccess = (token: string): void => {
    window.localStorage.setItem('token', token)
    setToken(token)
  }

  return <LogInForm onSuccess={onLoginSuccess} />
}

const appDiv = document.getElementById('app')
if (appDiv === null) { throw new Error('Could not find #app div.') }
render(<App />, appDiv)
