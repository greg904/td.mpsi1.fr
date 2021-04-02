import 'bootstrap'
import 'bootstrap/dist/css/bootstrap.css' // Import precompiled Bootstrap css

import { render, h, JSX } from 'preact'
import { useState, useEffect } from 'preact/hooks'
import { LogInForm } from './LogInForm'
import useStickyState from './use-sticky-state'
import * as net from './net'
import Loader from './Loader'
import { UnitDetails } from './UnitDetails'

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
    <UnitDetails
      unitId={1}
      groupA={student.groupA}
      authToken={authToken}
    />
  )

  // return <Fragment>
  //   <Welcome student={student} />
  //   <UnitListing units={units} groupA={student.groupA} />
  // </Fragment>
}

function runApp (): void {
  const appDiv = document.getElementById('app')
  if (appDiv === null) { throw new Error('Could not find #app div.') }
  render(<App />, appDiv)
}

runApp()
