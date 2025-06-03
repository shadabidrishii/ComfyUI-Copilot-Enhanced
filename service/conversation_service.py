# Copyright (C) 2025 AIDC-AI
# Licensed under the MIT License.

import json
import os
import asyncio
import time
import sys
from pathlib import Path
from typing import Optional, Dict, Any, TypedDict, List, Union

# Add parent directory to path to allow imports
sys.path.append(str(Path(__file__).parent.parent))

# Import server mock
from service.server import app as server

from aiohttp import web
import aiohttp
import base64

# Use in-memory dictionary to store session messages
session_messages = {}

# Add at the beginning of the file
STATIC_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "public")

# Import the server instance and routes
from .server import server, add_route

# Make server available globally
server = server

# Define types using TypedDict
class Node(TypedDict):
    name: str  # Node name
    description: str  # Node description
    image: str  # Node image URL (optional)
    github_url: str  # Node GitHub URL
    from_index: int  # Node position in the list
    to_index: int  # Node position in the list

class NodeInfo(TypedDict):
    existing_nodes: List[Node]  # Installed nodes
    missing_nodes: List[Node]  # Missing nodes

class Workflow(TypedDict):
    id: Optional[int]
    name: Optional[str]
    description: Optional[str]
    image: Optional[str]
    workflow: Optional[str]

class ExtItem(TypedDict):
    type: str
    data: Union[dict, list]

class ChatResponse(TypedDict):
    session_id: str
    text: Optional[str]
    finished: bool
    type: str
    format: str
    ext: Optional[List[ExtItem]]

# Get workflow template
def get_workflow_templates():
    templates = [
        {
            "id": 1,
            "name": "Image Generation",
            "description": "Generate images using a text prompt",
            "image": "https://placehold.co/600x400"
        },
        {
            "id": 2,
            "name": "Image to Image",
            "description": "Transform an image based on a text prompt",
            "image": "https://placehold.co/600x400"
        },
        {
            "id": 3,
            "name": "Image Upscaling",
            "description": "Upscale and enhance image quality",
            "image": "https://placehold.co/600x400"
        }
    ]
    
    return templates

async def fetch_messages(request):
    session_id = request.query.get("session_id")
    if not session_id or session_id not in session_messages:
        return web.json_response([])
    return web.json_response(session_messages[session_id])

def fetch_messages_sync(session_id):
    print("fetch_messages: ", session_id)
    return session_messages.get(session_id, [])

async def workflow_gen(request):
    """Handle POST request to generate a workflow."""
    print("Received workflow_gen request")
    try:
        data = await request.json()
        # Mock response for workflow generation
        return web.json_response({
            "status": "success",
            "workflow": {
                "id": "workflow_" + str(hash(str(data)))[:8],
                "name": data.get("name", "Generated Workflow"),
                "description": "A generated workflow based on your request",
                "nodes": [],
                "connections": []
            }
        })
    except Exception as e:
        return web.json_response({"error": str(e)}, status=500)

async def upload_to_oss(file_data, filename):
    """Handle file upload to OSS (mock implementation)."""
    try:
        # In a real implementation, this would upload the file to an object storage service
        file_url = f"https://example.com/uploads/{filename}"
        return file_url
    except Exception as e:
        print(f"Error uploading file: {e}")
        raise

async def invoke_chat(request):
    """Handle chat messages and generate responses."""
    try:
        data = await request.json()
        session_id = data.get("session_id", "default_session")
        message = data.get("message", "")
        
        print(f"Received chat request - Session: {session_id}, Message: {message}")
        
        # Initialize session if it doesn't exist
        if session_id not in session_messages:
            session_messages[session_id] = []
        
        # Add user message to session
        session_messages[session_id].append({"role": "user", "content": message})
        
        # Generate AI response based on message content
        if "hello" in message.lower():
            ai_response = "Hello! How can I assist you with ComfyUI today?"
        elif "workflow" in message.lower():
            ai_response = "I can help you create a workflow. What kind of workflow are you looking to create?"
        else:
            ai_response = f"I received your message: {message}"
        
        # Add AI response to session
        session_messages[session_id].append({"role": "assistant", "content": ai_response})
        
        # Create response in the format expected by the client
        response_data = {
            "session_id": session_id,
            "response": ai_response,
            "timestamp": int(time.time())
        }
        print(f"Sending response: {response_data}")
        
        # Return a dictionary that FastAPI can convert to JSON
        return response_data
        
    except Exception as e:
        error_msg = f"Error in invoke_chat: {str(e)}"
        print(error_msg)
        # Return a dictionary with error information
        return {"error": "An error occurred while processing your request", "details": str(e)}

# Define routes using the add_route function
def setup_routes():
    """Set up all the routes for the conversation service."""
    add_route("/workspace/fetch_messages_by_id", fetch_messages, methods=["GET"])
    add_route("/workspace/fetch_workflow_templates", get_workflow_templates, methods=["GET"])
    add_route("/workspace/workflow_gen", workflow_gen, methods=["POST"])
    add_route("/workspace/upload", upload_to_oss, methods=["POST"])
    add_route("/workspace/chat", invoke_chat, methods=["POST"])

# Call setup_routes to register all routes
setup_routes()
