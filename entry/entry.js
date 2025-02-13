
// Copyright (C) 2025 AIDC-AI
// Licensed under the MIT License.

//@ts-ignore
import { api } from "../../scripts/api.js";

setTimeout(() => {
  import(api.api_base + "/copilot_web/input.js");
}, 500);
