import time
from fastapi import APIRouter, HTTPException, Query
from typing import List, Dict, Any, Optional
from .node_service import fetch_node_repos, get_git_repo, BUILT_IN_NODE_TYPES

router = APIRouter()

@router.get("/repos")
async def get_node_repos(node_types: str = Query(..., description="Comma-separated list of node types")):
    try:
        node_type_list = [t.strip() for t in node_types.split(",") if t.strip()]
        result = await fetch_node_repos(node_type_list)
        if isinstance(result, tuple) and len(result) == 2 and isinstance(result[1], int):
            error, status_code = result
            raise HTTPException(status_code=status_code, detail=error)
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/git-info/{node_type}")
async def get_node_git_info(node_type: str):
    try:
        result = await get_git_repo(node_type)
        if isinstance(result, tuple) and len(result) == 2 and isinstance(result[1], int):
            error, status_code = result
            raise HTTPException(status_code=status_code, detail=error)
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def _get_builtin_node_types():
    """Helper function to get built-in node types without causing recursion."""
    return {
        "node_types": sorted(list(BUILT_IN_NODE_TYPES)),
        "count": len(BUILT_IN_NODE_TYPES),
        "timestamp": int(time.time())
    }

@router.get("/builtin-types")
async def get_builtin_node_types():
    try:
        result = await _get_builtin_node_types()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
