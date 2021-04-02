import 'bootstrap'
import 'bootstrap/dist/css/bootstrap.css' // Import precompiled Bootstrap css

import { render, h, JSX } from 'preact'
import { Dashboard } from './Dashboard'
import { LogInForm } from './LogInForm'
import useStickyState from './use-sticky-state'

function App (): JSX.Element {
  const [userToken, setUserToken] = useStickyState('token')
  if (userToken === null) {
    return <LogInForm onSuccess={setUserToken} />
  }

  return <Dashboard token={userToken} />
}

function runApp (): void {
  const appDiv = document.getElementById('app')
  if (appDiv === null) { throw new Error('Could not find #app div.') }
  render(<App />, appDiv)
}

runApp()
