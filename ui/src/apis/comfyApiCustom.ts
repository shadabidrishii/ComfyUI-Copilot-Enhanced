/*
 * @Author: ai-business-hql ai.bussiness.hql@gmail.com
 * @Date: 2025-02-17 20:53:45
 * @LastEditors: ai-business-hql ai.bussiness.hql@gmail.com
 * @LastEditTime: 2025-03-25 20:22:38
 * @FilePath: /comfyui_copilot/ui/src/apis/comfyApiCustom.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
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

export async function runPrompt(json_data: any): Promise<any> {
  const response = await api.fetchApi("/prompt", {
    method: "POST",
    body: JSON.stringify(json_data),
  });
  return await response.json();
}

export async function getImage(filename: string, subfolder: string, folderType: string): Promise<Blob> {
  try {
    const params = new URLSearchParams({
      filename,
      subfolder,
      type: folderType
    });
    
    const response = await api.fetchApi(`/view?${params.toString()}`, { 
      method: "GET" 
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }
    
    return await response.blob();
  } catch (error) {
    console.error("Error fetching image:", error);
    throw error;
  }
}

export async function getHistory(promptId: string): Promise<any> {
  try {
    const response = await api.fetchApi(`/history/${promptId}`, { 
      method: "GET" 
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch history: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error fetching history:", error);
    throw error;
  }
}

