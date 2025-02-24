import React, { createContext, useContext, useReducer, Dispatch } from 'react';
import { Message } from '../types/types';

interface ChatState {
  messages: Message[];
  selectedNode: any | null;
  installedNodes: any[];
  loading: boolean;
  sessionId: string | null;
  showChat: boolean;
}

type ChatAction = 
  | { type: 'SET_MESSAGES'; payload: Message[] }
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'UPDATE_MESSAGE'; payload: Message }
  | { type: 'SET_SELECTED_NODE'; payload: any }
  | { type: 'SET_INSTALLED_NODES'; payload: any[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_SESSION_ID'; payload: string }
  | { type: 'SET_SHOW_CHAT'; payload: boolean }
  | { type: 'CLEAR_MESSAGES' };

const initialState: ChatState = {
  messages: [],
  selectedNode: null,
  installedNodes: [],
  loading: false,
  sessionId: null,
  showChat: false,
};

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'SET_MESSAGES':
      return { ...state, messages: action.payload };
    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.payload] };
    case 'UPDATE_MESSAGE':
      return {
        ...state,
        messages: state.messages.map(msg => 
          msg.id === action.payload.id ? action.payload : msg
        )
      };
    case 'SET_SELECTED_NODE':
      return { ...state, selectedNode: action.payload };
    case 'SET_INSTALLED_NODES':
      return { ...state, installedNodes: action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_SESSION_ID':
      return { ...state, sessionId: action.payload };
    case 'SET_SHOW_CHAT':
      return { ...state, showChat: action.payload };
    case 'CLEAR_MESSAGES':
      return { ...state, messages: [] };
    default:
      return state;
  }
}

const ChatContext = createContext<{
  state: ChatState;
  dispatch: Dispatch<ChatAction>;
}>({ state: initialState, dispatch: () => null });

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(chatReducer, initialState);

  return (
    <ChatContext.Provider value={{ state, dispatch }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChatContext() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
} 