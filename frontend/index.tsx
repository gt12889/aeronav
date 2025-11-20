import { createRoot } from "react-dom/client";
import { ErrorBoundary } from "./components/ErrorBoundary.js";
import App from "./components/App.js";
import { setupGlobalErrorHandlers } from "./components/CrashReporter.js";

// Setup global error handlers
setupGlobalErrorHandlers();

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

const root = createRoot(rootElement);
root.render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

