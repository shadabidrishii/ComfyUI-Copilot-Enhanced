import { useEffect } from 'react';
import { app } from '../utils/comfyapp';
import { useChatContext } from '../context/ChatContext';

export function useNodeSelection(enabled: boolean = true) {
  const { dispatch } = useChatContext();

  useEffect(() => {
    if (!enabled) return;

    const handleNodeSelection = () => {
      const selectedNodes = app.canvas.selected_nodes;
      if (Object.keys(selectedNodes ?? {}).length) {
        const nodeInfo = Object.values(selectedNodes)[0];
        dispatch({ type: 'SET_SELECTED_NODE', payload: nodeInfo });
      } else {
        dispatch({ type: 'SET_SELECTED_NODE', payload: null });
      }
    };

    document.addEventListener("click", handleNodeSelection);
    return () => {
      document.removeEventListener("click", handleNodeSelection);
    };
  }, [dispatch, enabled]);
} 