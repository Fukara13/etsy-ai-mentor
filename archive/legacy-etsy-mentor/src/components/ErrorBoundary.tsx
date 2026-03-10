import React from 'react'

type Props = {
  children: React.ReactNode
}

type State = {
  hasError: boolean
}

/**
 * Catches renderer errors and shows a friendly fallback instead of black screen.
 * Does not change product behavior; stability/diagnostics only.
 */
export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo.componentStack)
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary-fallback">
          <p className="error-boundary-message">
            Bir hata oluştu. Lütfen sayfayı yenileyin.
          </p>
          <button type="button" className="btn-primary" onClick={this.handleReload}>
            Yenile
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
