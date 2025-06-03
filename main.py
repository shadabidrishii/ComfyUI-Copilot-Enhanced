import os
import sys
from fastapi import FastAPI, Request, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
import uvicorn
from pathlib import Path
from typing import Optional, Dict, Any
import json

# Import routers
from service.conversation_router import router as conversation_router
from service.node_router import router as node_router

# Initialize FastAPI app
app = FastAPI(
    title="ComfyUI-Copilot API",
    description="API for ComfyUI-Copilot - Your Intelligent Assistant for Comfy-UI",
    version="1.0.0"
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development only
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(conversation_router, prefix="/api", tags=["Conversation"])
app.include_router(node_router, prefix="/api/nodes", tags=["Nodes"])

# Serve static files from the UI dist directory
ui_dist_path = Path(__file__).parent / "ui" / "dist"
if ui_dist_path.exists():
    app.mount("/", StaticFiles(directory=str(ui_dist_path), html=True), name="ui")

# Health check endpoint
@app.get("/api/health")
async def health_check():
    return {
        "status": "ok",
        "message": "ComfyUI-Copilot API is running",
        "version": "1.0.0"
    }

# Serve the main page for any other route (for SPA routing)
@app.get("/{full_path:path}")
async def catch_all(full_path: str):
    if ui_dist_path.exists():
        index_path = ui_dist_path / "index.html"
        if index_path.exists():
            return FileResponse(index_path)
    raise HTTPException(status_code=404, detail="Not Found")

if __name__ == "__main__":
    # Run the server
    uvicorn.run(
        "main:app",
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", 8000)),
        reload=True,
        log_level="info"
    )
