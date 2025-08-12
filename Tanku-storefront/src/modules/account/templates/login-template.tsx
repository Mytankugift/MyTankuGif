"use client"

import { useState } from "react"

import Register from "@modules/account/components/register"
//import Login from "@modules/account/components/login"
import LoginWithContext from "@modules/account/components/login-with-context"

export enum LOGIN_VIEW {
  SIGN_IN = "sign-in",
  REGISTER = "register",
}

const LoginTemplate = () => {
  const [currentView, setCurrentView] = useState("sign-in")

  return (
    <div className="w-full h-full min-h-screen flex justify-start">
      {currentView === "sign-in" ? (
        <LoginWithContext setCurrentView={setCurrentView} />
      ) : (
        <Register setCurrentView={setCurrentView} />
      )}
    </div>
  )
}

export default LoginTemplate
