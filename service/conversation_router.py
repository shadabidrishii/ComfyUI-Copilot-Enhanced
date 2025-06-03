from fastapi import APIRouter, HTTPException, Request, UploadFile, File
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import json
import asyncio
from .conversation_service import (
    fetch_messages_sync,
    workflow_gen,
    upload_to_oss,
    invoke_chat,
    get_workflow_templates,
    session_messages
)

router = APIRouter()

@router.get("/fetch-messages/{session_id}")
async def get_messages(session_id: str):
    try:
        messages = fetch_messages_sync(session_id)
        return {"messages": messages}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/workflow-gen")
async def generate_workflow(request: Request):
    try:
        data = await request.json()
        result = await workflow_gen(request)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    try:
        file_data = await file.read()
        result = upload_to_oss(file_data, file.filename)
        return {"url": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class ChatRequest(BaseModel):
    session_id: str
    message: str

@router.post("/chat")
async def chat(request: ChatRequest):
    try:
        # Create a mock aiohttp request for backward compatibility
        class MockRequest:
            def __init__(self, data):
                self.data = data
            
            async def json(self):
                return self.data
        
        mock_request = MockRequest({"session_id": request.session_id, "message": request.message})
        
        # Call the original function with the mock request
        response = await invoke_chat(mock_request)
        return response
    except Exception as e:
        print(f"Error in chat endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/templates")
async def get_templates():
    try:
        templates = get_workflow_templates()
        return {"templates": templates}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
