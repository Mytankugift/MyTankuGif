'use client'

import React, { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

/**
 * Error boundary temporal para el layout (main): loguea errores en consola en producción.
 */
export class MainLayoutErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[MainLayoutErrorBoundary]', error.message)
    console.error(error.stack)
    if (errorInfo?.componentStack) {
      console.error(errorInfo.componentStack)
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center"
          style={{ backgroundColor: '#1E1E1E', color: '#fff' }}
        >
          <p className="text-lg" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Algo salió mal. Recarga la página o vuelve al inicio.
          </p>
          <button
            type="button"
            className="rounded-full px-6 py-2 font-semibold text-black"
            style={{ backgroundColor: '#73FFA2', fontFamily: 'Poppins, sans-serif' }}
            onClick={() => window.location.reload()}
          >
            Recargar
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
