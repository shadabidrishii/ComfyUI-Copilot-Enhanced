"""
Mock server module to handle imports for the ComfyUI-Copilot application.
This is a temporary solution to make the application run.
"""
from typing import Dict, Any, Optional, List, Callable
from dataclasses import dataclass

class WebSocket:
    """Mock WebSocket class for handling WebSocket connections."""
    async def send_json(self, data: Dict[str, Any]) -> None:
        """Mock send_json method."""
        pass

@dataclass
class PromptServer:
    """Mock PromptServer class for handling server routes and WebSocket connections."""
    instance: 'PromptServer' = None
    
    def __init__(self):
        self.app = {}
        self.routes = self.Routes()
        self.user_namespace = {}
        self.sockets: List[WebSocket] = []
        PromptServer.instance = self
    
    class Routes:
        """Mock Routes class for defining server routes."""
        def __init__(self):
            self.get_routes = {}
            self.post_routes = {}
        
        def get(self, path: str):
            """Mock GET route decorator."""
            def decorator(func):
                self.get_routes[path] = func
                return func
            return decorator
        
        def post(self, path: str):
            """Mock POST route decorator."""
            def decorator(func):
                self.post_routes[path] = func
                return func
            return decorator
    
    def send_sync(self, event: str, data: Dict[str, Any], sid: str = None) -> None:
        """Mock send_sync method for sending synchronous events."""
        pass
    
    def send(self, event: str, data: Dict[str, Any], sid: str = None) -> None:
        """Mock send method for sending events."""
        pass

# Create and expose the PromptServer instance
app = {}
PromptServer = PromptServer()

# Make PromptServer available at module level
PromptServerClass = PromptServer.__class__

# Define the server functions
def add_route(path: str, handler: Callable, methods: Optional[List[str]] = None, name: str = None) -> None:
    """Mock method to add routes."""
    if methods is None:
        methods = ['GET']
    
    if 'GET' in methods:
        PromptServer.routes.get_routes[path] = handler
    if 'POST' in methods:
        PromptServer.routes.post_routes[path] = handler

def add_routes(routes: Dict[str, Callable]) -> None:
    """Mock method to add multiple routes."""
    for path, handler in routes.items():
        if path.startswith('GET '):
            PromptServer.routes.get_routes[path[4:]] = handler
        elif path.startswith('POST '):
            PromptServer.routes.post_routes[path[5:]] = handler
        else:
            PromptServer.routes.get_routes[path] = handler

def add_static_path(prefix: str, path: str) -> None:
    """Mock method to add static paths."""
    # In a real implementation, this would configure static file serving
    pass

# Make the server instance available as 'server'
server = PromptServer
