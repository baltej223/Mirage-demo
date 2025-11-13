import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';


interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    // Optionally reload the page
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-[200]">
          <div className="relative w-[400px] bg-white/90 backdrop-blur-xl border border-red-300 shadow-2xl rounded-2xl p-6">
            <div className="text-center">
              <div className="text-red-500 text-5xl mb-4">⚠️</div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">
                Something went wrong
              </h2>
              <p className="text-gray-700 mb-4">
                An unexpected error occurred. Please try reloading the application.
              </p>
              
              {this.state.error && (
                <details className="mb-4 text-left">
                  <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                    Error details
                  </summary>
                  <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto max-h-40 text-gray-800">
                    {this.state.error.toString()}
                    {this.state.errorInfo && this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}

              <div className="flex gap-3">
                <button
                  onClick={this.handleReset}
                  className="flex-1 bg-red-400 from-blue-500 to-indigo-500 text-white py-2 px-4 rounded-xl font-medium shadow-md hover:shadow-lg hover:from-blue-600 hover:to-indigo-600 transition-all"
                >
                  Reload Application
                </button>
                <button
                  onClick={() => this.setState({ hasError: false })}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-xl font-medium hover:bg-gray-300 transition-all"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
