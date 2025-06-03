// Copyright (C) 2025 AIDC-AI
// Licensed under the MIT License.

import { EWorkflowPrivacy } from "./dbTypes";

export type WorkspaceRoute =
  | "root"
  | "customNodes"
  | "recentFlows"
  | "gallery"
  | "versionHistory"
  | "saveAsModal"
  | "modelList"
  | "spotlightSearch"
  | "downloadSpaceJson"
  | "installModels"
  | "share";

export type Session = {
  username: string | null;
  shareKey: string;
};

export type ShareWorkflowData = {
  version: {
    name: string;
    json: string;
  };
  workflow: {
    name: string;
    cloudID?: string | null;
  };
  nodeDefs: Object;
  privacy: EWorkflowPrivacy;
};

export interface Node {
  name: string;
  description: string;
  image: string;
  github_url: string;
  from_index: number;
  to_index: number;
}

export interface NodeInfo {
  existing_nodes: Node[];
  missing_nodes: Node[];
}

export interface Subgraph {
    id: number;
    name: string; 
    description: string;
    json: Record<string, any>;
    tags: string[];
}

export interface Workflow {
  id?: number;
  name?: string;
  description?: string;
  image?: string;
}

export interface ExtItem {
  type: string;
  data: any;
}

export interface ChatResponse {
  message_id?: string;
  session_id: string;
  text?: string;
  finished: boolean;
  format: string;
  ext?: ExtItem[];
}

export interface Message {
  id: string;
  role: string;
  content: string;
  name?: string;
  format?: string;
  finished?: boolean;
  type?: string;
  metadata?: any;
  trace_id?: string;
}

export interface ToolCall {
  toolCallId: string
  name: string
  args: {}
  result?: {} | []
}

export interface ComponentConfig {
  id: string
  name: string
  type: string
  props: any
  children: ComponentConfig[]
}

export interface WorkflowOption {
  name: string;
  description: string;
  thumbnail: string;
  dir: string;
  workflow: string;
}

export interface MessageContent {
  ai_message: string;
  options?: string[] | WorkflowOption[];
}

export interface OptimizedWorkflowRequest {
  workflow_id: number;
  prompt: string;
}

export interface OptimizedWorkflowResponse {
  workflow: any;  // Workflow data
  optimized_params: [number, string, number, string, string | number | boolean][];  // Optimized parameters
}

export interface TrackEventRequest {
  event_type: string;
  message_type: string;
  user_id?: string | null;
  session_id?: string | null;
  message_id?: string | null;
  data: any;
}
