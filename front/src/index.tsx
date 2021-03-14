import "bootstrap";
import "bootstrap/dist/css/bootstrap.css"; // Import precompiled Bootstrap css

import { render, h } from "preact"
import { useState } from "preact/hooks"
import { Dashboard } from "./Dashboard"
import { LogInForm } from "./LogInForm"

function App() {
    const [token, setToken] = useState<string | undefined>(() => {
        const tmp = localStorage.getItem("token")
        return tmp === null ? undefined : tmp
    })
    if (token)
        return <Dashboard token={token}/>

    const onLoginSuccess = (token: string) => {
        window.localStorage.setItem("token", token)
        setToken(token)
    }
    
    return <LogInForm onSuccess={onLoginSuccess}/>
}

render(<App/>, document.getElementById("app")!!)
