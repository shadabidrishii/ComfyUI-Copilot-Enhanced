import asyncio
import server
from aiohttp import web
import folder_paths
from .service.conversation_service import *

WEB_DIRECTORY = "entry"
NODE_CLASS_MAPPINGS = {}
__all__ = ['NODE_CLASS_MAPPINGS']
version = "V2.1.0"

workspace_path = os.path.join(os.path.dirname(__file__))
comfy_path = os.path.dirname(folder_paths.__file__)
db_dir_path = os.path.join(workspace_path, "db")

dist_path = os.path.join(workspace_path, 'dist/copilot_web')
if os.path.exists(dist_path):
    server.PromptServer.instance.app.add_routes([
        web.static('/copilot_web/', dist_path),
    ])
else:
    print(f"🦄🦄🔴🔴Error: Web directory not found: {dist_path}")
