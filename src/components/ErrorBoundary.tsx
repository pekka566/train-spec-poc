import { Component, type ReactNode, type ErrorInfo } from "react";
import { Alert, Button, Box } from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Alert
          icon={<IconAlertCircle size={16} aria-hidden />}
          title="Something went wrong"
          color="red"
          variant="light"
          m="lg"
        >
          {this.state.error?.message ?? "An unexpected error occurred."}
          <Box mt="sm">
            <Button variant="light" size="sm" onClick={this.handleReset}>
              Try again
            </Button>
          </Box>
        </Alert>
      );
    }

    return this.props.children;
  }
}
