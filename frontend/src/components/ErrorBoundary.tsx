import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary component
 *
 * Catches JavaScript errors anywhere in the child component tree,
 * logs them to Sentry if available, and displays a friendly error
 * message instead of a blank white screen.
 *
 * @example
 * <ErrorBoundary>
 *   <SomeGameComponent />
 * </ErrorBoundary>
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info);
    // Log to Sentry if available
    try {
      const Sentry = (window as unknown as { Sentry?: { captureException: (e: Error) => void } }).Sentry;
      if (Sentry) {
        Sentry.captureException(error);
      }
    } catch {
      // Sentry not available
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          style={{
            minHeight: "60vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "'DM Sans', 'Inter', sans-serif",
            background: "#0f1117",
          }}
        >
          <div
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,126,103,0.2)",
              borderRadius: 16,
              padding: "3em 2.5em",
              textAlign: "center",
              maxWidth: 480,
              backdropFilter: "blur(8px)",
            }}
          >
            <div style={{ fontSize: "3em", marginBottom: "0.5em" }}>😬</div>
            <h2
              style={{
                color: "#ff7e67",
                fontSize: "1.3em",
                fontWeight: 700,
                marginBottom: "0.5em",
              }}
            >
              Something went wrong
            </h2>
            <p
              style={{
                color: "rgba(255,255,255,0.5)",
                fontSize: "0.95em",
                lineHeight: 1.6,
                marginBottom: "1.5em",
              }}
            >
              An unexpected error occurred. Try refreshing the page or
              going back to the home screen.
            </p>
            {typeof window !== "undefined" && (window as unknown as { __DEV__?: boolean }).__DEV__ && this.state.error && (
              <pre
                style={{
                  background: "rgba(255,126,103,0.08)",
                  border: "1px solid rgba(255,126,103,0.15)",
                  borderRadius: 8,
                  padding: "1em",
                  fontSize: "0.75em",
                  color: "#ff7e67",
                  textAlign: "left",
                  overflow: "auto",
                  marginBottom: "1.5em",
                  maxHeight: 200,
                }}
              >
                {this.state.error.message}
              </pre>
            )}
            <div style={{ display: "flex", gap: "0.8em", justifyContent: "center" }}>
              <button
                onClick={this.handleReset}
                style={{
                  padding: "0.65em 1.4em",
                  borderRadius: 50,
                  border: "none",
                  background: "linear-gradient(90deg, #7ecbff, #4fa3d1)",
                  color: "#1a1a2e",
                  fontWeight: 700,
                  fontSize: "0.95em",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Try Again
              </button>
              <button
                onClick={() => (window.location.href = "/home")}
                style={{
                  padding: "0.65em 1.4em",
                  borderRadius: 50,
                  border: "1px solid rgba(126,203,255,0.3)",
                  background: "transparent",
                  color: "#7ecbff",
                  fontWeight: 600,
                  fontSize: "0.95em",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;