// Copyright (C) 2025 AIDC-AI
// Licensed under the MIT License.

const isDevelopment = import.meta.env.MODE === 'development'

const defaultApiBaseUrl = 'http://localhost:8000'

export const config = {
  apiBaseUrl: isDevelopment 
    ? defaultApiBaseUrl 
    : (import.meta.env.VITE_API_BASE_URL || defaultApiBaseUrl)
} 