// Copyright (C) 2025 AIDC-AI
// Licensed under the MIT License.

import LiteGraph from "../types/litegraph.d";
import { app } from "./comfyapp";

export function addNodeOnGraph(type: string, options: any = {}) {
    const node = LiteGraph.createNode(type, type, options);
    app.graph.add(node);
    return node;
}