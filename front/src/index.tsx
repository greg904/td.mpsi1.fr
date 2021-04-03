import 'bootstrap'
import 'bootstrap/dist/css/bootstrap.css' // Import precompiled Bootstrap css

import { render, JSX } from 'preact'
import { useState, useEffect } from 'preact/hooks'
import { BrowserRouter, Link, Route, Switch, useParams } from 'react-router-dom'

import { LogInForm } from './LogInForm'
import useStickyState from './use-sticky-state'
import * as net from './net'
import Loader from './Loader'
import { UnitDetails } from './UnitDetails'
import { Welcome } from './Welcome'
import { UnitListing } from './UnitListing'
import { UploadCorrectionForm } from './UploadCorrectionForm'

interface UnitDetailsRouteProps {
  authToken: string
  units: net.Unit[]
  studentIsEvenGroup: boolean
}

function UnitDetailsRoute (props: UnitDetailsRouteProps): JSX.Element {
  const { unitId: unitIdStr }: { unitId?: string } = useParams()
  const unitId = parseInt(unitIdStr as string)

  const unit = props.units.find(u => u.id === unitId) as net.Unit

  return (
    <>
      <nav class='mb-4' aria-label='Chemin de navigation'>
        <ol class='breadcrumb'>
          <li class='breadcrumb-item'><Link to='/'>Accueil</Link></li>
          <li class='breadcrumb-item active' aria-current='page'>{unit.name}</li>
        </ol>
      </nav>
      <UnitDetails
        unitId={unitId}
        groupA={props.studentIsEvenGroup}
        authToken={props.authToken}
      />
    </>
  )
}

interface UploadCorrectionFormRouteProps {
  authToken: string
  units: net.Unit[]
}

function UploadCorrectionFormRoute (props: UploadCorrectionFormRouteProps): JSX.Element {
  const { unitId: unitIdStr, exerciseIndex: exerciseIndexStr }: { unitId?: string, exerciseIndex?: string } = useParams()
  const unitId = parseInt(unitIdStr as string)
  const exerciseIndex = parseInt(exerciseIndexStr as string) - 1

  const unit = props.units.find(u => u.id === unitId) as net.Unit

  return (
    <>
      <nav class='mb-4' aria-label='Chemin de navigation'>
        <ol class='breadcrumb'>
          <li class='breadcrumb-item'><Link to='/'>Accueil</Link></li>
          <li class='breadcrumb-item'><Link to={`/chapitres/${unitId}`}>{unit.name}</Link></li>
          <li class='breadcrumb-item active' aria-current='page'>Ajout de la correction pour l'exercice {exerciseIndex + 1}</li>
        </ol>
      </nav>
      <UploadCorrectionForm
        authToken={props.authToken}
        unitId={unitId}
        exerciseIndex={exerciseIndex}
      />
    </>
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

  const now = new Date().valueOf()
  const relevantUnits = units.filter(u => {
    const minDeadline = Math.min(u.deadlineA.valueOf(), u.deadlineB.valueOf())
    // The deadline is at the end of the day.
    return now < minDeadline + 1000 * 60 * 60 * 24
  })

  return (
    <BrowserRouter>
      <Switch>
        <Route path='/chapitres/:unitId(\d+)' exact>
          <UnitDetailsRoute
            units={units}
            studentIsEvenGroup={student.groupA}
            authToken={authToken}
          />
        </Route>
        <Route path='/chapitres/:unitId(\d+)/exercices/:exerciseIndex(\d+)/corrections/ajouter' exact>
          <UploadCorrectionFormRoute
            authToken={authToken}
            units={units}
          />
        </Route>
        <Route path='/' exact>
          <nav class='mb-4' aria-label='Chemin de navigation'>
            <ol class='breadcrumb'>
              <li class='breadcrumb-item active' aria-current='page'>Accueil</li>
            </ol>
          </nav>
          <Welcome
            studentFullName={student.fullName}
            studentIsEvenGroup={student.groupA}
            onClickDisconnect={() => setAuthToken(null)}
          />
          <UnitListing
            units={relevantUnits}
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
