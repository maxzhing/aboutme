import { Component, Suspense, type ErrorInfo, type ReactNode } from 'react';
import { Button, LoadingBlock } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/Icon';

interface State {
  error?: Error;
}

/**
 * Section 59: never show a raw error. A failed page keeps the shell usable and
 * offers a real way out.
 */
export class RouteBoundary extends Component<{ children: ReactNode }, State> {
  state: State = {};

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Kept to the console so a developer can see it; never surfaced to the student.
    console.error('Route error', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="page">
          <div className="card card-pad-lg" style={{ maxWidth: 560, margin: '3rem auto' }}>
            <div className="row g-3 mb-4">
              <span className="empty-art">
                <Icon name="alert" size={22} />
              </span>
              <div>
                <h1 className="t-xl display">This page could not load</h1>
                <p className="t-sm subtle mt-1">
                  Something went wrong on our side. Your data is safe and nothing was lost.
                </p>
              </div>
            </div>
            <div className="row g-2 wrap">
              <Button variant="primary" icon="refresh" onClick={() => this.setState({ error: undefined })}>
                Try again
              </Button>
              <Button to="/app" icon="home">
                Back to home
              </Button>
            </div>
          </div>
        </div>
      );
    }
    return <Suspense fallback={<LoadingBlock />}>{this.props.children}</Suspense>;
  }
}
