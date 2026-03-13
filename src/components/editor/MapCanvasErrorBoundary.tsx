"use client";

import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export default class MapCanvasErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-muted">
          <div className="text-center space-y-3">
            <p className="text-sm text-muted-foreground">Map failed to load</p>
            <p className="text-xs text-destructive max-w-sm">{this.state.error.message}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => this.setState({ error: null })}
            >
              Retry
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
