// Copyright (C) 2025 AIDC-AI
// Licensed under the MIT License.

import React from "react";
import ReactDOM from "react-dom/client";
import { waitForApp } from "./utils/comfyapp.ts";
import "./input.css";

const App = React.lazy(() =>
  import("./App.tsx").then(({ default: App }) => ({
    default: App,
  })),
);

function waitForDocumentBody() {
  return new Promise((resolve) => {
    if (document.body) {
      return resolve(document.body);
    }

    document.addEventListener("DOMContentLoaded", () => {
      resolve(document.body);
    });
  });
}

waitForDocumentBody()
  .then(() => waitForApp())
  .then(() => {
    const topbar = document.createElement("div");
    document.body.append(topbar);
    ReactDOM.createRoot(topbar).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    );
  });
