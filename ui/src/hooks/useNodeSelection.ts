import { useEffect } from 'react';
import { app } from '../utils/comfyapp';
import { useChatContext } from '../context/ChatContext';

export function useNodeSelection(enabled: boolean = true) {
  const { state, dispatch } = useChatContext();
  const { activeTab, screenState } = state;

  useEffect(() => {
    if (!enabled) return;

    const handleNodeSelection = (event: MouseEvent) => {
      // and only when in parameter-debug tab
      const isParameterDebugTab = activeTab === 'parameter-debug';
      const isAllowedScreen = !screenState || screenState.currentScreen === 0;
      
      if (isAllowedScreen) {
        const selectedNodes = app.canvas.selected_nodes;
        if (Object.keys(selectedNodes ?? {}).length) {
          const nodeInfo = Object.values(selectedNodes);
          dispatch({ type: 'SET_SELECTED_NODE', payload: nodeInfo });
        } else {
          dispatch({ type: 'SET_SELECTED_NODE', payload: null });
        }
      }
    };

    document.addEventListener("click", handleNodeSelection);
    return () => {
      document.removeEventListener("click", handleNodeSelection);
    };
  }, [dispatch, enabled, activeTab, screenState]);
} 