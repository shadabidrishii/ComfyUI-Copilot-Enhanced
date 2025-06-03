// Copyright (C) 2025 AIDC-AI
// Licensed under the MIT License.

import { config } from '../config';

import JSEncrypt from 'jsencrypt';

/**
 * Utility functions for handling cryptographic operations
 */

/**
 * Fetch the RSA public key from the server
 * @returns The RSA public key in PEM format
 */
export async function fetchRsaPublicKey(): Promise<string> {
  try {
    const response = await fetch(`${config.apiBaseUrl}/api/chat/rsa_public_key`);
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.message || 'Failed to fetch RSA public key');
    }
    
    return result.data;
  } catch (error) {
    console.error('Error fetching RSA public key:', error);
    throw error;
  }
}

/**
 * Encrypt data using the RSA public key
 * @param data The data to encrypt
 * @param publicKey The RSA public key in PEM format
 * @returns The encrypted data
 */
export async function encryptWithRsaPublicKey(data: string, publicKey: string): Promise<string> {
  try {
    // Check if Web Crypto API is available
    if (window.crypto && window.crypto.subtle) {
      // Extract the PEM contents between the header and footer
      const pemHeader = "-----BEGIN PUBLIC KEY-----";
      const pemFooter = "-----END PUBLIC KEY-----";
      const pemContents = publicKey.substring(
        publicKey.indexOf(pemHeader) + pemHeader.length,
        publicKey.indexOf(pemFooter)
      ).replace(/\s/g, '');
      
      // Base64 decode the PEM contents
      const binaryDer = window.atob(pemContents);
      
      // Convert binary to ArrayBuffer
      const buffer = new ArrayBuffer(binaryDer.length);
      const bufView = new Uint8Array(buffer);
      for (let i = 0; i < binaryDer.length; i++) {
        bufView[i] = binaryDer.charCodeAt(i);
      }
      
      // Import the key
      const cryptoKey = await window.crypto.subtle.importKey(
        "spki",
        buffer,
        {
          name: "RSA-OAEP",
          hash: "SHA-256"
        },
        false,
        ["encrypt"]
      );
      
      // Encrypt the data
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);
      const encryptedBuffer = await window.crypto.subtle.encrypt(
        {
          name: "RSA-OAEP"
        },
        cryptoKey,
        dataBuffer
      );
      
      // Convert the encrypted data to base64
      return arrayBufferToBase64(encryptedBuffer);
    } else {
      // Use JSEncrypt as fallback (for HTTP environments)
      console.warn('Web Crypto API not available, using JSEncrypt as fallback');
      const encrypt = new JSEncrypt();
      encrypt.setPublicKey(publicKey);
      const encrypted = encrypt.encrypt(data);
      if (!encrypted) {
        throw new Error('JSEncrypt encryption failed');
      }
      return encrypted;
    }
  } catch (error) {
    console.error('Error encrypting data with RSA public key:', error);
    throw error;
  }
}

/**
 * Convert an ArrayBuffer to a base64 string
 * This ensures compatibility with Python's base64.b64decode
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

/**
 * Verify if an OpenAI API key is valid
 * @param apiKey The OpenAI API key to verify
 * @param baseUrl The OpenAI API base URL
 * @param publicKey The RSA public key for encryption
 * @returns A boolean indicating if the key is valid
 */
export async function verifyOpenAiApiKey(apiKey: string, baseUrl: string, publicKey: string): Promise<boolean> {
  try {
    // Encrypt the API key
    const encryptedApiKey = await encryptWithRsaPublicKey(apiKey, publicKey);
    
    // Call the verification endpoint
    const response = await fetch(`${config.apiBaseUrl}/api/chat/verify_openai_key`, {
      method: 'GET',
      headers: {
        'Encrypted-Openai-Api-Key': encryptedApiKey,
        'Openai-Base-Url': baseUrl
      }
    });
    
    const result = await response.json();
    return result.success && result.data === true;
  } catch (error) {
    console.error('Error verifying OpenAI API key:', error);
    return false;
  }
} 