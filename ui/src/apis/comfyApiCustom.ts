// Copyright (C) 2025 AIDC-AI
// Licensed under the MIT License.

import { api } from "../utils/comfyapp";

export async function getObjectInfo(): Promise<Record<string, any>> {
  try {
    const response = await api.fetchApi("/object_info", { method: "GET" });
    return await response.json();
  } catch (error) {
    console.error("Error fetching object info:", error);
    throw error;
  }
}

export async function getInstalledNodes(): Promise<string[]> {
  const objectInfos = await getObjectInfo();
  return Object.keys(objectInfos);
}
