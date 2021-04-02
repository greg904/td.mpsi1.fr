import 'bootstrap'
import 'bootstrap/dist/css/bootstrap.css' // Import precompiled Bootstrap css

import { render, JSX } from 'preact'
import { useState, useEffect } from 'preact/hooks'
import { BrowserRouter, Route, Switch, useParams } from 'react-router-dom'

import { LogInForm } from './LogInForm'
import useStickyState from './use-sticky-state'
import * as net from './net'
import Loader from './Loader'
import { UnitDetails } from './UnitDetails'
import { Welcome } from './Welcome'
import { UnitListing } from './UnitListing'

interface UnitDetailsRouteProps {
  groupA: boolean
  authToken: string
}

function UnitDetailsRoute (props: UnitDetailsRouteProps): JSX.Element {
  const { id }: { id?: string } = useParams()

  return (
    <UnitDetails
      unitId={parseInt(id as string)}
      groupA={props.groupA}
      authToken={props.authToken}
    />
  )
}

function App (): JSX.Element {
  const [authToken, setAuthToken] = useStickyState('token')
  if (authToken === null) {
    return <LogInForm onSuccess={setAuthToken} />
  }

  const [student, setStudent] = useState<net.Student | null>(null)
  const [units, setUnits] = useState<net.Unit[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    net.fetchStudentData(authToken)
      .then(setStudent)
      .catch(err => {
        if (err instanceof net.InvalidAuthTokenError) {
          // User has to log in again.
          setAuthToken(null)
        } else {
          console.error('Failed to retrieve student data:', err)
          setError(true)
        }
      })
    net.fetchUnits(authToken)
      .then(setUnits)
      .catch(err => {
        if (err instanceof net.InvalidAuthTokenError) {
          // User has to log in again.
          setAuthToken(null)
        } else {
          console.error('Failed to retrieve units:', err)
          setError(true)
        }
      })
  }, [authToken])

  if (error) {
    return (
      <div class='alert alert-danger' role='alert'>
        Une erreur est survenue lors de la récupération des données.
      </div>
    )
  }

  if (student === null || units === null) {
    return <Loader />
  }

  return (
    <BrowserRouter>
      <Switch>
        <Route path='/chapitres/:id(\d+)' exact>
          <UnitDetailsRoute
            groupA={student.groupA}
            authToken={authToken}
          />
        </Route>
        <Route path='/' exact>
          <Welcome student={student} />
          <UnitListing
            units={units}
            groupA={student.groupA}
          />
        </Route>
      </Switch>
    </BrowserRouter>
  )
}

function runApp (): void {
  const appDiv = document.getElementById('app')
  if (appDiv === null) { throw new Error('Could not find #app div.') }
  render(<App />, appDiv)
}

runApp()
