import React, { Component } from 'react';

/**
 * Error Boundary component to prevent blank screens on runtime errors.
 * Implements componentDidCatch and getDerivedStateFromError to display
 * a fallback UI and log errors.
 */
class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        // Update state to show fallback UI on next render
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // Log error details for debugging
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        this.setState({ errorInfo });

        // In production, you could send this to an error reporting service
        if (process.env.NODE_ENV === 'production') {
            // Example: errorReportingService.log({ error, errorInfo });
        }
    }

    handleReload = () => {
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '100vh',
                    padding: '2rem',
                    textAlign: 'center',
                    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                    color: '#ffffff'
                }}>
                    <div style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        backdropFilter: 'blur(10px)',
                        borderRadius: '16px',
                        padding: '3rem',
                        maxWidth: '500px',
                        border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                        <div style={{
                            fontSize: '4rem',
                            marginBottom: '1rem'
                        }}>
                            ⚠️
                        </div>
                        <h1 style={{
                            fontSize: '1.5rem',
                            fontWeight: '600',
                            marginBottom: '1rem',
                            color: '#ff6b6b'
                        }}>
                            Something went wrong
                        </h1>
                        <p style={{
                            fontSize: '1rem',
                            color: 'rgba(255, 255, 255, 0.7)',
                            marginBottom: '2rem',
                            lineHeight: '1.6'
                        }}>
                            An unexpected error occurred. Please try refreshing the page.
                            If the problem persists, contact support.
                        </p>
                        <button
                            onClick={this.handleReload}
                            style={{
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '0.75rem 2rem',
                                fontSize: '1rem',
                                fontWeight: '500',
                                cursor: 'pointer',
                                transition: 'transform 0.2s, box-shadow 0.2s'
                            }}
                            onMouseOver={(e) => {
                                e.target.style.transform = 'translateY(-2px)';
                                e.target.style.boxShadow = '0 4px 20px rgba(102, 126, 234, 0.4)';
                            }}
                            onMouseOut={(e) => {
                                e.target.style.transform = 'translateY(0)';
                                e.target.style.boxShadow = 'none';
                            }}
                        >
                            Refresh Page
                        </button>
                        {process.env.NODE_ENV !== 'production' && this.state.error && (
                            <details style={{
                                marginTop: '2rem',
                                padding: '1rem',
                                background: 'rgba(255, 107, 107, 0.1)',
                                borderRadius: '8px',
                                textAlign: 'left',
                                fontSize: '0.875rem'
                            }}>
                                <summary style={{
                                    cursor: 'pointer',
                                    color: '#ff6b6b',
                                    marginBottom: '0.5rem'
                                }}>
                                    Error Details (Development Only)
                                </summary>
                                <pre style={{
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word',
                                    color: 'rgba(255, 255, 255, 0.6)',
                                    margin: 0
                                }}>
                                    {this.state.error.toString()}
                                    {this.state.errorInfo && this.state.errorInfo.componentStack}
                                </pre>
                            </details>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
