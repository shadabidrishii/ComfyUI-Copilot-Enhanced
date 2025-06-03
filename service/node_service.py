# Copyright (C) 2025 AIDC-AI
# Licensed under the MIT License.


import inspect
import json
import os
import sys
import subprocess
import json
import time
from pathlib import Path
from typing import Dict, List, Any, Optional, Union, TypedDict

# Add parent directory to path to allow imports
sys.path.append(str(Path(__file__).parent.parent))

# Import the server instance and add_route function
from .server import server, add_route

# Mock NODE_CLASS_MAPPINGS since we don't have the actual nodes module
NODE_CLASS_MAPPINGS = {}

# Define routes
def setup_routes():
    """Set up all the routes for the node service."""
    add_route("/nodes/fetch_repos", fetch_node_repos, methods=["GET"])
    add_route("/nodes/git-info/{node_type}", get_git_repo, methods=["GET"])
    add_route("/nodes/builtin-types", get_builtin_node_types, methods=["GET"])

# Note: setup_routes() will be called after all functions are defined

# Built-in node types for ComfyUI
BUILT_IN_NODE_TYPES = {
    # Core nodes
    "BasicScheduler", "CLIPLoader", "CLIPMergeSimple", "CLIPSave", "CLIPSetLastLayer",
    "CLIPTextEncode", "CLIPTextEncodeSDXL", "CLIPTextEncodeSDXLRefiner", "CLIPVisionEncode",
    "CLIPVisionLoader", "Canny", "CheckpointLoader", "CheckpointLoaderSimple", "CheckpointSave",
    
    # Conditioning nodes
    "ConditioningAverage", "ConditioningCombine", "ConditioningConcat", "ConditioningSetArea",
    "ConditioningSetAreaPercentage", "ConditioningSetAreaStrength", "ConditioningSetMask",
    "ConditioningSetMaskAndCombine", "ConditioningSetMaskOrCombine", "ConditioningSetPosition",
    "ConditioningSetPositionAndCombine", "ConditioningSetRegion", "ConditioningSetTimestepRange",
    
    # ControlNet and LoRA
    "ControlLoraLoader", "ControlNetApply", "ControlNetApplyAdvanced", "ControlNetLoader", 
    "LoraLoader", "LoraLoaderModelOnly",
    
    # Image processing
    "CropImage", "ImageScale", "ImageScaleBy", "ImageScaleToTotalPixels", "ImageUpscaleWithModel",
    "ImageBlend", "ImageBlur", "ImageCompositeMasked", "ImageCrop", "ImageInvert",
    "ImagePadForOutpaint", "ImageQuantize", "ImageSharpen", "ImageToMask",
    
    # Latent space
    "VAEDecode", "VAEEncode", "VAELoader", "VAESave", "VAEDecodeTiled", "VAEEncodeForInpaint", 
    "VAEEncodeTiled", "LatentUpscale", "LatentUpscaleBy", "LatentFromBatch",
    
    # Loading/saving
    "LoadImage", "LoadImageMask", "LoadLatent", "SaveImage", "SaveLatent",
    "SaveAnimatedPNG", "SaveAnimatedWEBP",
    
    # Model operations
    "ModelMergeAdd", "ModelMergeBlocks", "ModelMergeSimple", "ModelMergeSubtract",
    "ModelSamplingContinuousEDM", "ModelSamplingDiscrete", "PatchModelAddDownscale",
    "StyleModelApply", "StyleModelLoader", "UNETLoader", "UpscaleModelLoader",
    
    # Samplers and schedulers
    "SamplerCustom", "SamplerDPMPP_2M_SDE", "SamplerDPMPP_SDE", "BasicScheduler",
    "PolyexponentialScheduler", "SDTurboScheduler", "VPScheduler",
    
    # Other utilities
    "MaskComposite", "MaskToImage", "PerpNeg", "PhotoMakerEncode", "PhotoMakerLoader",
    "PorterDuffImageComposite", "PreviewImage", "RebatchImages", "RebatchLatents",
    "RepeatImageBatch", "RepeatLatentBatch", "RescaleCFG", "SD_4XUpscale_Conditioning",
    "SVD_img2vid_Conditioning", "SelfAttentionGuidance", "SetLatentNoiseMask",
    "SolidMask", "SplitImageWithAlpha", "SplitSigmas", "StableZero123_Conditioning",
    "StableZero123_Conditioning_Batched", "TomePatchModel", "VideoLinearCFGGuidance",
    "unCLIPCheckpointLoader", "unCLIPConditioning"
}

async def get_git_repo(node_type: str):
    """Get git repository information for a specific node type."""
    if not node_type:
        raise HTTPException(status_code=400, detail="Node type is required")
    
    if node_type in BUILT_IN_NODE_TYPES:
        return {
            "is_builtin": True,
            "node_type": node_type
        }
    
    # For non-built-in nodes, return mock data
    return {
        "is_builtin": False,
        "node_type": node_type,
        "repo_info": {
            "git_repo": f"example/{node_type}",
            "commit_hash": f"abc123{node_type[:4]}",
            "url": f"https://github.com/example/{node_type}"
        }
    }

async def fetch_node_repos(node_types: List[str]):
    """Fetch repository information for multiple node types."""
    try:
        if not node_types:
            raise HTTPException(status_code=400, detail="NodeTypes parameter is required and should be a list of node types")
            return {"error": "NodeTypes parameter is required and should be a list of node types"}, 400
        
        repos_mapping = {}
        for node_type in node_types:
            if node_type in BUILT_IN_NODE_TYPES:
                continue  # Skip built-in types
                
            # Add mock repository data
            repos_mapping[node_type] = {
                "gitRepo": f"example/{node_type}",
                "commitHash": f"abc123{node_type[:4]}",
                "url": f"https://github.com/example/{node_type}"
            }
        
        return repos_mapping
    except Exception as e:
        return {"error": f"Error fetching node repositories: {str(e)}"}, 500

async def get_builtin_node_types():
    """Get a list of all built-in node types."""
    return {
        "node_types": sorted(list(BUILT_IN_NODE_TYPES)),
        "count": len(BUILT_IN_NODE_TYPES),
        "timestamp": int(time.time())
    }

# Call setup_routes to register all routes
setup_routes()
