import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
// @ts-expect-error CSS is handled by the bundler and has no TypeScript declarations.
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
