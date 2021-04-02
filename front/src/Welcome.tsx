import { h, JSX } from 'preact'

import * as net from './net'

export interface WelcomeProps {
  student: net.Student
}

export function Welcome (props: WelcomeProps): JSX.Element {
  const groupName = props.student.groupA ? 'pair' : 'impair'

  return (
    <p>
      Bonjour <strong>{props.student.fullName}</strong>.<br />
      Vous êtes dans le groupe <strong>{groupName}</strong>.
    </p>
  )
}
