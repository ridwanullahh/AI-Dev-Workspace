import React, { Component, ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';
import { Button } from './button';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { db } from '../../database/schema';
import type { ErrorLog } from '../../database/schema';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  errorId: string | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  showReportButton?: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  async componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Log error to database
    try {
      const errorLog: ErrorLog = {
        id: this.state.errorId || `error_${Date.now()}`,
        type: 'error',
        category: 'ui',
        message: error.message,
        stack: error.stack,
        metadata: {
          componentStack: errorInfo.componentStack,
          userAgent: navigator.userAgent,
          url: window.location.href,
          timestamp: Date.now()
        },
        resolved: false,
        timestamp: new Date()
      };

      await db.errors.add(errorLog);
    } catch (dbError) {
      console.error('Failed to log error to database:', dbError);
    }

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Store in local storage as backup
    try {
      const errorReport = {
        id: this.state.errorId,
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      };

      const existingReports = JSON.parse(localStorage.getItem('errorReports') || '[]');
      existingReports.push(errorReport);
      if (existingReports.length > 50) {
        existingReports.splice(0, existingReports.length - 50);
      }
      localStorage.setItem('errorReports', JSON.stringify(existingReports));

      console.error('Error report generated:', errorReport);
    } catch (reportError) {
      console.error('Failed to send error report:', reportError);
    }
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    });
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private handleReportIssue = async () => {
    const errorReport = {
      errorId: this.state.errorId,
      message: this.state.error?.message,
      stack: this.state.error?.stack,
      componentStack: this.state.errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent
    };

    try {
      await navigator.clipboard.writeText(JSON.stringify(errorReport, null, 2));
      alert('Error details copied to clipboard! Please paste in a GitHub issue.');
    } catch {
      alert('Failed to copy error details');
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="max-w-2xl w-full">
            <CardHeader>
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-8 w-8 text-destructive" />
                <div>
                  <CardTitle className="text-2xl">Something went wrong</CardTitle>
                  <CardDescription>
                    An unexpected error occurred. The error has been logged.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {this.state.error && (
                <div className="bg-muted p-4 rounded-lg">
                  <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <Bug className="h-4 w-4" />
                    Error Details
                  </h3>
                  <pre className="text-xs overflow-auto max-h-40 bg-background p-2 rounded border">
                    {this.state.error.message}
                    {this.state.error.stack && `\n\n${this.state.error.stack}`}
                  </pre>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <Button onClick={this.handleRetry} className="flex-1">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
                <Button variant="outline" onClick={this.handleGoHome} className="flex-1">
                  <Home className="h-4 w-4 mr-2" />
                  Go Home
                </Button>
                {this.props.showReportButton !== false && (
                  <Button variant="outline" onClick={this.handleReportIssue}>
                    <Bug className="h-4 w-4 mr-2" />
                    Report Issue
                  </Button>
                )}
              </div>

              <div className="text-sm text-muted-foreground">
                <p>Error ID: {this.state.errorId}</p>
                <p>If this problem persists, please report it with the error ID above.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook for functional components to use error boundary
export const useErrorHandler = () => {
  return async (error: Error, errorInfo: React.ErrorInfo) => {
    console.error('Error caught by hook:', error, errorInfo);

    // Log to database
    try {
      const errorLog: ErrorLog = {
        id: `error_hook_${Date.now()}`,
        type: 'error',
        category: 'ui',
        message: error.message,
        stack: error.stack,
        metadata: {
          componentStack: errorInfo.componentStack,
          hookError: true
        },
        resolved: false,
        timestamp: new Date()
      };

      await db.errors.add(errorLog);
    } catch (dbError) {
      console.error('Failed to log error:', dbError);
    }
  };
};

// Wrapper component for lazy components with error boundary
export const LazyWrapper: React.FC<{
  children: ReactNode;
  fallback?: ReactNode;
}> = ({ children, fallback }) => (
  <ErrorBoundary
    fallback={fallback || (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-4" />
          <p className="text-muted-foreground">Failed to load component</p>
        </div>
      </div>
    )}
  >
    {children}
  </ErrorBoundary>
);
