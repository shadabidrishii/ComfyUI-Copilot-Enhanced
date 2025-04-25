/*
 * @Author: ai-business-hql ai.bussiness.hql@gmail.com
 * @Date: 2025-02-17 20:53:45
 * @LastEditors: ai-business-hql ai.bussiness.hql@gmail.com
 * @LastEditTime: 2025-02-25 20:31:45
 * @FilePath: /comfyui_copilot/ui/src/main.tsx
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
// Copyright (C) 2025 AIDC-AI
// Licensed under the MIT License.

import React, { Suspense } from "react";
import ReactDOM from "react-dom/client";
import { waitForApp } from "./utils/comfyapp.ts";
import "./scoped-tailwind.css";
import "./fonts.css";

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
    app.extensionManager.registerSidebarTab({
      id: "comfyui-copilot",
      icon: "cc-icon-logo",
      title: "ComfyUI Copilot",
      tooltip: "ComfyUI Copilot",
      type: "custom",
      render: (el: HTMLElement) => {
        const container = document.createElement("div");
        container.id = "comfyui-copilot-plugin";
        el.appendChild(container);
        ReactDOM.createRoot(container).render(
          <React.StrictMode>
            <Suspense fallback={<div>Loading...</div>}>
              <App />
            </Suspense>
          </React.StrictMode>,
        );
      },
    });
  });
