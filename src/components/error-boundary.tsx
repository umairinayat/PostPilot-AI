"use client";

import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type ErrorBoundaryProps = {
  children: ReactNode;
  fallback?: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[50vh] items-center justify-center p-8">
          <Card className="max-w-md">
            <CardContent className="p-8 text-center">
              <h2 className="mb-2 text-lg font-semibold text-foreground">
                Something went wrong
              </h2>
              <p className="mb-4 text-sm text-muted-foreground">
                {this.state.error?.message || "An unexpected error occurred."}
              </p>
              <Button
                onClick={() => this.setState({ hasError: false, error: null })}
              >
                Try again
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
