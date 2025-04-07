// Copyright (C) 2025 AIDC-AI
// Licensed under the MIT License.

import { config } from '../config'
import { fetchApi } from "../Api";
import { Message, ChatResponse, OptimizedWorkflowRequest, OptimizedWorkflowResponse, Node, ExtItem, TrackEventRequest } from "../types/types";
import { generateUUID } from '../utils/uuid';
import { encryptWithRsaPublicKey } from '../utils/crypto';

const BASE_URL = config.apiBaseUrl

const getApiKey = () => {
    const apiKey = localStorage.getItem('chatApiKey');
    if (!apiKey) {
        // alert('API key is required. Please set your API key first.');
        // throw new Error('API key is required. Please set your API key first.');
    }
    return apiKey;
};

// Get OpenAI configuration from localStorage
const getOpenAiConfig = () => {
    const openaiApiKey = localStorage.getItem('openaiApiKey');
    const openaiBaseUrl = localStorage.getItem('openaiBaseUrl') || 'https://api.openai.com/v1';
    const rsaPublicKey = localStorage.getItem('rsaPublicKey');
    
    return { 
        openaiApiKey: openaiApiKey || '', 
        openaiBaseUrl, 
        rsaPublicKey 
    };
};

// Get browser language
const getBrowserLanguage = () => {
    return navigator.language || 'zh-CN'; // Default to Chinese if language is not available
};

export namespace WorkflowChatAPI {
  export async function trackEvent(
    request: TrackEventRequest
  ): Promise<void> {
    try {
      // Use non-blocking fetch to avoid interrupting the main flow
      const apiKey = getApiKey();
      const browserLanguage = getBrowserLanguage();
      request.session_id = localStorage.getItem("sessionId") || null;
      fetch(`${BASE_URL}/api/chat/track_event`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'accept': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Authorization': `Bearer ${apiKey}`,
          'trace-id': generateUUID(),
          'Accept-Language': browserLanguage,
        },
        body: JSON.stringify(request),
      }).catch(err => {
        // Silently log errors without throwing exceptions
        console.warn('Track event failed:', err);
      });
    } catch (error) {
      // Catch any synchronous errors but don't interrupt the business flow
      console.warn('Error preparing track event:', error);
    }
    // Return immediately without waiting for the response
    return Promise.resolve();
  }
  


  export async function* streamInvokeServer(
    sessionId: string, 
    prompt: string, 
    images: File[] = [], 
    intent: string | null = null, 
    ext: any | null = null,
    trace_id?: string
  ): AsyncGenerator<ChatResponse> {
    try {
      const apiKey = getApiKey();
      const browserLanguage = getBrowserLanguage();
      const { openaiApiKey, openaiBaseUrl, rsaPublicKey } = getOpenAiConfig();
      // Generate a unique message ID for this chat request
      const messageId = generateUUID();

      // if (!apiKey) {
      //   yield {
      //       text: 'API key is required. Please set your API key first.⚙\nIf you don\'t have an API key, please email us at ComfyUI-Copilot@service.alibaba.com and we will get back to you as soon as possible.',
      //       finished: true
      //   } as ChatResponse;
      //   return;
      // }
      
      // Convert images to base64
      const imagePromises = (images || []).map(file => 
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        })
      );
      
      const base64Images = await Promise.all(imagePromises);

      // Handle ext parameter
      let finalExt = ext ? (Array.isArray(ext) ? ext : [ext]) : [];
      
      // Prepare headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'accept': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Authorization': `Bearer ${apiKey}`,
        'trace-id': trace_id || generateUUID(),
        'Accept-Language': browserLanguage,
      };
      
      // Add OpenAI configuration headers if available
      if (openaiApiKey && openaiApiKey.trim() !== '' && rsaPublicKey) {
        try {
          const encryptedApiKey = await encryptWithRsaPublicKey(openaiApiKey, rsaPublicKey);
          headers['Encrypted-Openai-Api-Key'] = encryptedApiKey;
          headers['Openai-Base-Url'] = openaiBaseUrl;
        } catch (error) {
          console.error('Error encrypting OpenAI API key:', error);
        }
      }
      
      const response = await fetch(`${BASE_URL}/api/chat/invoke`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          session_id: sessionId,
          prompt: prompt,
          mock: false,
          intent: intent,
          ext: finalExt,
          images: base64Images.map((base64, index) => ({
            filename: images[index].name,
            data: base64
          }))
        }),
      });

      const reader = response.body!.getReader();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += new TextDecoder().decode(value);
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            yield {
              ...JSON.parse(line) as ChatResponse,
              message_id: messageId
            };
          }
        }
      }

      if (buffer.trim()) {
        yield {
          ...JSON.parse(buffer) as ChatResponse,
          message_id: messageId
        };
      }
    } catch (error) {
      console.error('Error in streamInvokeServer:', error);
      alert(error instanceof Error ? error.message : 'An error occurred while streaming, please refresh the page and try again.');
      throw error;
    }
  }

  export async function getOptimizedWorkflow(
    workflowId: number, 
    prompt: string
  ): Promise<OptimizedWorkflowResponse> {
    try {
      const apiKey = getApiKey();
      const browserLanguage = getBrowserLanguage();
      const { openaiApiKey, openaiBaseUrl, rsaPublicKey } = getOpenAiConfig();
      
      // Prepare headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'accept': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Authorization': `Bearer ${apiKey}`,
        'trace-id': generateUUID(),
        'Accept-Language': browserLanguage,
      };
      
      // Add OpenAI configuration headers if available
      if (openaiApiKey && openaiApiKey.trim() !== '' && rsaPublicKey) {
        try {
          const encryptedApiKey = await encryptWithRsaPublicKey(openaiApiKey, rsaPublicKey);
          headers['Encrypted-Openai-Api-Key'] = encryptedApiKey;
          headers['Openai-Base-Url'] = openaiBaseUrl;
        } catch (error) {
          console.error('Error encrypting OpenAI API key:', error);
        }
      }
      
      const response = await fetch(`${BASE_URL}/api/chat/get_optimized_workflow`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          workflow_id: workflowId,
          prompt: prompt
        } as OptimizedWorkflowRequest),
      });

      const result = await response.json();
      if (!result.success) {
        const message = result.message || 'Failed to get optimized workflow';
        alert(message);
        throw new Error(message);
      }

      return result.data as OptimizedWorkflowResponse;
    } catch (error) {
      console.error('Error getting optimized workflow:', error);
      alert(error instanceof Error ? error.message : 'Failed to get optimized workflow');
      throw error;
    }
  }

  export async function batchGetNodeInfo(nodeTypes: string[]): Promise<any> {
    const apiKey = getApiKey();
    const browserLanguage = getBrowserLanguage();
    const { openaiApiKey, openaiBaseUrl, rsaPublicKey } = getOpenAiConfig();
    
    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'trace-id': generateUUID(),
      'Accept-Language': browserLanguage,
    };
    
    // Add OpenAI configuration headers if available
    if (openaiApiKey && openaiApiKey.trim() !== '' && rsaPublicKey) {
      try {
        const encryptedApiKey = await encryptWithRsaPublicKey(openaiApiKey, rsaPublicKey);
        headers['Encrypted-Openai-Api-Key'] = encryptedApiKey;
        headers['Openai-Base-Url'] = openaiBaseUrl;
      } catch (error) {
        console.error('Error encrypting OpenAI API key:', error);
      }
    }
    
    const response = await fetch(`${BASE_URL}/api/chat/get_node_info_by_types`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ 
        node_types: nodeTypes
      }),
    });
    const result = await response.json();
    if (!result.success) {
      const message = result.message || 'Failed to get node info by types';
      alert(message);
      throw new Error(message);
    }
    return result.data as Node[];
  }

  export async function fetchMessages(sessionId: string): Promise<Message[]> {
    try {
      // First check if we have cached messages in localStorage
      const cachedMessages = localStorage.getItem(`messages_${sessionId}`);
      if (cachedMessages) {
        console.log('Using cached messages from localStorage');
        return JSON.parse(cachedMessages) as Message[];
      }
      
      const apiKey = getApiKey();
      const browserLanguage = getBrowserLanguage();
      const { openaiApiKey, openaiBaseUrl, rsaPublicKey } = getOpenAiConfig();
      
      // Prepare headers
      const headers: Record<string, string> = {
        'accept': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'trace-id': generateUUID(),
        'Accept-Language': browserLanguage,
      };
      
      // Add OpenAI configuration headers if available
      if (openaiApiKey && openaiApiKey.trim() !== '' && rsaPublicKey) {
        try {
          const encryptedApiKey = await encryptWithRsaPublicKey(openaiApiKey, rsaPublicKey);
          headers['Encrypted-Openai-Api-Key'] = encryptedApiKey;
          headers['Openai-Base-Url'] = openaiBaseUrl;
        } catch (error) {
          console.error('Error encrypting OpenAI API key:', error);
        }
      }
      
      const response = await fetch(`${BASE_URL}/api/chat/get_messages_by_session_id?session_id=${sessionId}`, {
        method: 'GET',
        headers,
      });

      const result = await response.json();
      if (!result.success) {
        const message = result.message || 'Failed to fetch messages';
        alert(message + ', please refresh the page and try again.');
        throw new Error(message);
      }

      const messages = result.data.map((msg: any) => {
        console.log("msg.ext", msg.ext);
        return {
          id: msg.id.toString(),
          content: msg.role === 'ai' ? JSON.stringify({
            session_id: sessionId,
            text: msg.content,
            finished: msg.finished || false,
            format: msg.format || 'markdown',
            ext: msg.ext
          }) : msg.content,
          role: msg.role,
          name: msg.role === 'ai' ? 'Assistant' : undefined,
          format: msg.format || 'markdown',
          finished: msg.finished
        }
      });
      
      // Cache the messages in localStorage
      localStorage.setItem(`messages_${sessionId}`, JSON.stringify(messages));
      
      return messages;
    } catch (error) {
      console.error('Error fetching messages:', error);
      alert(error instanceof Error ? error.message : 'Failed to fetch messages' + ', please refresh the page and try again.');
      throw error;
    }
  }

  export async function fetchAnnouncement(): Promise<string> {
    try {
      const apiKey = getApiKey();
      const browserLanguage = getBrowserLanguage();
      const { openaiApiKey, openaiBaseUrl, rsaPublicKey } = getOpenAiConfig();
      
      // Prepare headers
      const headers: Record<string, string> = {
        'accept': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'trace-id': generateUUID(),
        'Accept-Language': browserLanguage,
      };
      
      // Add OpenAI configuration headers if available
      if (openaiApiKey && openaiApiKey.trim() !== '' && rsaPublicKey) {
        try {
          const encryptedApiKey = await encryptWithRsaPublicKey(openaiApiKey, rsaPublicKey);
          headers['Encrypted-Openai-Api-Key'] = encryptedApiKey;
          headers['Openai-Base-Url'] = openaiBaseUrl;
        } catch (error) {
          console.error('Error encrypting OpenAI API key:', error);
        }
      }
      
      const response = await fetch(`${BASE_URL}/api/chat/announcement`, {
        method: 'GET',
        headers,
      });

      const result = await response.json();
      if (!result.success) {
        const message = result.message || 'Failed to fetch announcement';
        console.error(message);
        return '';
      }

      return result.data as string;
    } catch (error) {
      console.error('Error fetching announcement:', error);
      return '';
    }
  }

  export async function generateSDPrompts(text: string): Promise<string[]> {
    const maxRetries = 3;
    let retryCount = 0;
    let lastError: any;

    while (retryCount < maxRetries) {
      try {
        const apiKey = getApiKey();
        const browserLanguage = getBrowserLanguage();
        
        // Prepare headers
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'accept': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'trace-id': generateUUID(),
          'Accept-Language': browserLanguage,
        };
        
        const response = await fetch(`${BASE_URL}/api/param_debug/generate_sd_prompts`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            text: text
          }),
        });

        const result = await response.json();
        if (!result.success) {
          const message = result.message || 'Failed to generate SD prompts';
          throw new Error(message);
        }

        return result.data as string[];
      } catch (error) {
        lastError = error;
        retryCount++;
        
        if (retryCount >= maxRetries) {
          console.error(`Error generating SD prompts after ${maxRetries} attempts:`, error);
          throw error;
        }
        
        console.warn(`Attempt ${retryCount} failed, retrying... Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        
        // Wait with exponential backoff before retrying (500ms, 1000ms, 2000ms)
        await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, retryCount - 1)));
      }
    }

    // This should never be reached due to the throw in the loop, but TypeScript needs it
    throw lastError;
  }
}

  

