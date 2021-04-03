import { JSX } from 'preact'

export interface WelcomeProps {
  studentFullName: string
  studentInGroupEven: boolean
  onClickDisconnect?: () => void
}

export function Welcome (props: WelcomeProps): JSX.Element {
  const groupName = props.studentInGroupEven ? 'pair' : 'impair'

  return (
    <>
      <p>
        Bonjour <strong>{props.studentFullName}</strong>.<br />
        Vous êtes dans le groupe <strong>{groupName}</strong>.<br />
      </p>
      <button
        type='button'
        class='btn btn-outline-danger btn-sm mb-4'
        onClick={() => {
          if (props.onClickDisconnect !== undefined) { props.onClickDisconnect() }
        }}
      >
        Se déconnecter
      </button>
    </>
  )
}
