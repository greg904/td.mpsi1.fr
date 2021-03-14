import { h } from "preact"
import { useState } from "preact/hooks"

enum Alert {
    InvalidCreds,
    Error,
}

export interface Props {
    onSuccess(token: string): void
}

export function LogInForm(props: Props) {
    const [loading, setLoading] = useState(false)
    const [alert, setAlert] = useState<Alert | undefined>(undefined)
    const [wasValidated, setWasValidated] = useState<boolean>(false)

    let loader = null
    if (loading) {
        loader = <div class="spinner-border" role="status">
            <span class="visually-hidden">Chargement...</span>
        </div>
    }

    let alertDiv = null
    if (alert !== undefined) {
        alertDiv = <div class="alert alert-danger" role="alert">
            {alert === Alert.InvalidCreds ? "Identifiants invalides." : "Une erreur est survenue."}
        </div>
    }

    const doLogin = async (lastName: string, password: string) => {
        setLoading(true)

        try {
            const username = lastName
                .replace(/\W+/, "-")
                .toLowerCase()

            const res = await fetch(process.env.API_ENDPOINT + "log-in", {
                method: "POST",
                body: JSON.stringify({
                    username,
                    password
                })
            })
            
            if (res.status === 401) {
                setAlert(Alert.InvalidCreds)
                setLoading(false)
                return
            } else if (res.status !== 200) {
                setAlert(Alert.Error)
                setLoading(false)
                return
            }

            const json = await res.json()
            if (typeof json !== "string")
                throw new Error("Invalid log in response")
            props.onSuccess(json)
        } catch (err) {
            console.error("Failed to log in", err)
            setAlert(Alert.Error)
            setLoading(false)
        }
    }

    const onSubmit = (e: Event) => {
        e.preventDefault()

        const form = e.target as HTMLFormElement
        if (!form.reportValidity()) {
            setWasValidated(true)
            return
        } else {
            setWasValidated(false)
        }

        const formData = new FormData(e.target as HTMLFormElement)
        const lastName = formData.get("last-name") as string
        const password = formData.get("password") as string
        doLogin(lastName, password)
    }

    return <form class={wasValidated ? "was-validated" : ""} onSubmit={onSubmit} noValidate>
        {alertDiv}
        <div class="mb-3">
            <label for="last-name" class="form-label">Nom de famille</label>
            <input type="text" class="form-control" id="last-name" name="last-name" placeholder="Dupont" required></input>
            <div class="invalid-feedback">Veuillez remplir ce champ.</div>
        </div>
        <div class="mb-3">
            <label for="password" class="form-label">Mot de passe</label>
            <input type="password" class="form-control" id="password" name="password" required></input>
            <div class="invalid-feedback">Veuillez remplir ce champ.</div>
        </div>
        <div class={loading ? "mb-3" : ""}>
            <button type="submit" class="btn btn-primary" disabled={loading}>Se connecter</button>
        </div>
        {loader}
    </form>
}
