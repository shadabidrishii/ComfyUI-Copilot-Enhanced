# Copyright (C) 2025 AIDC-AI
# Licensed under the MIT License.

import json
import os
import asyncio
import time
from typing import Optional, Dict, Any, TypedDict, List, Union

import server
from aiohttp import web
import aiohttp
import base64

# 使用内存字典存储会话消息
session_messages = {}

# 在文件开头添加
STATIC_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "public")

# Define types using TypedDict
class Node(TypedDict):
    name: str  # 节点名称
    description: str  # 节点描述
    image: str  # 节点图片url，可为空
    github_url: str  # 节点github地址
    from_index: int  # 节点在列表中的位置
    to_index: int  # 节点在列表中的位置

class NodeInfo(TypedDict):
    existing_nodes: List[Node]  # 已安装的节点
    missing_nodes: List[Node]  # 未安装的节点

class Workflow(TypedDict, total=False):
    id: Optional[int]  # 工作流id
    name: Optional[str]  # 工作流名称
    description: Optional[str]  # 工作流描述
    image: Optional[str]  # 工作流图片
    workflow: Optional[str]  # 工作流

class ExtItem(TypedDict):
    type: str  # 扩展类型
    data: Union[dict, list]  # 扩展数据

class ChatResponse(TypedDict):
    session_id: str  # 会话id
    text: Optional[str]  # 返回文本
    finished: bool  # 是否结束
    type: str  # 返回的类型
    format: str  # 返回的格式
    ext: Optional[List[ExtItem]]  # 扩展信息

def get_workflow_templates():
    templates = []
    workflows_dir = os.path.join(STATIC_DIR, "workflows")
    
    for filename in os.listdir(workflows_dir):
        if filename.endswith('.json'):
            with open(os.path.join(workflows_dir, filename), 'r') as f:
                template = json.load(f)
                templates.append(template)
    
    return templates

@server.PromptServer.instance.routes.get("/workspace/fetch_messages_by_id")
async def fetch_messages(request):
    session_id = request.query.get('session_id')
    data = await asyncio.to_thread(fetch_messages_sync, session_id)
    return web.json_response(data)

def fetch_messages_sync(session_id):
    print("fetch_messages: ", session_id)
    return session_messages.get(session_id, [])

@server.PromptServer.instance.routes.post("/workspace/workflow_gen")
async def workflow_gen(request):
    print("Received workflow_gen request")
    req_json = await request.json()
    print("Request JSON:", req_json)
    
    response = web.StreamResponse(
        status=200,
        reason='OK',
        headers={
            'Content-Type': 'application/json',
            'X-Content-Type-Options': 'nosniff'
        }
    )
    await response.prepare(request)
    
    session_id = req_json.get('session_id')
    user_message = req_json.get('message')
    
    # Create user message
    user_msg = {
        "id": str(len(session_messages.get(session_id, []))),
        "content": user_message,
        "role": "user"
    }
    
    if "workflow" in user_message.lower():
        workflow = {
            "name": "basic_image_gen",
            "description": "Create a basic image generation workflow",
            "image": "https://placehold.co/600x400",
            "workflow": """{ ... }"""  # Your workflow JSON here
        }
        
        chat_response = ChatResponse(
            session_id=session_id,
            text="",
            finished=False,
            type="workflow_option",
            format="text",
            ext=[{"type": "workflows", "data": [workflow]}]
        )
        
        await response.write(json.dumps(chat_response).encode() + b"\n")
        
        message = "Let me help you choose a workflow. Here are some options available:"
        accumulated = ""
        for char in message:
            accumulated += char
            chat_response["text"] = accumulated
            await response.write(json.dumps(chat_response).encode() + b"\n")
            await asyncio.sleep(0.01)
        
        chat_response["finished"] = True
        chat_response["text"] = message
        await response.write(json.dumps(chat_response).encode() + b"\n")
        
    elif "recommend" in user_message.lower():
        existing_nodes = [
            {
                "name": "LoraLoader",
                "description": "Load LoRA weights for conditioning.",
                "image": "",
                "github_url": "https://github.com/CompVis/taming-transformers",
                "from_index": 0,
                "to_index": 0
            },
            {
                "name": "KSampler",
                "description": "Generate images using K-diffusion sampling.",
                "image": "",
                "github_url": "https://github.com/CompVis/taming-transformers",
                "from_index": 0,
                "to_index": 0
            }
        ]
        
        missing_nodes = [
            {
                "name": "CLIPTextEncode",
                "description": "Encode text prompts for conditioning.",
                "image": "",
                "github_url": "https://github.com/CompVis/clip-interrogator",
                "from_index": 0,
                "to_index": 0
            }
        ]
        
        node_info = {
            "existing_nodes": existing_nodes,
            "missing_nodes": missing_nodes
        }
        
        chat_response = ChatResponse(
            session_id=session_id,
            text="",
            finished=False,
            type="downstream_node_recommend",
            format="text",
            ext=[{"type": "node_info", "data": node_info}]
        )
        
        await response.write(json.dumps(chat_response).encode() + b"\n")
        
        message = "Here are some recommended nodes:"
        accumulated = ""
        for char in message:
            accumulated += char
            chat_response["text"] = accumulated
            await response.write(json.dumps(chat_response).encode() + b"\n")
            await asyncio.sleep(0.01)
        
        chat_response["finished"] = True
        chat_response["text"] = message
        await response.write(json.dumps(chat_response).encode() + b"\n")
        
    else:
        chat_response = ChatResponse(
            session_id=session_id,
            text="",
            finished=False,
            type="message",
            format="text",
            ext=[{"type": "guides", "data": ["Create a workflow", "Search for nodes", "Get node recommendations"]}]
        )
        
        await response.write(json.dumps(chat_response).encode() + b"\n")
        
        message = "I can help you with workflows, nodes, and more. Try asking about:"
        accumulated = ""
        for char in message:
            accumulated += char
            chat_response["text"] = accumulated
            await response.write(json.dumps(chat_response).encode() + b"\n")
            await asyncio.sleep(0.01)
        
        chat_response["finished"] = True
        chat_response["text"] = message
        await response.write(json.dumps(chat_response).encode() + b"\n")
    
    if session_id not in session_messages:
        session_messages[session_id] = []
    
    session_messages[session_id].extend([user_msg])
    
    await response.write_eof()
    return response

async def upload_to_oss(file_data: bytes, filename: str) -> str:
    # Implement your OSS upload logic here
    # Return the URL of the uploaded file
    pass

@server.PromptServer.instance.routes.post("/api/chat/invoke")
async def invoke_chat(request):
    data = await request.json()
    session_id = data['session_id']
    prompt = data['prompt']
    images = data.get('images', [])

    image_urls = []
    for image in images:
        # 从base64解码图片数据
        image_data = base64.b64decode(image['data'].split(',')[1])
        # 上传到OSS
        url = await upload_to_oss(image_data, image['filename'])
        image_urls.append(url)

    # 使用image_urls进行后续处理...
