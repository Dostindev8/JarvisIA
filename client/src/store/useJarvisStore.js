import { create } from 'zustand';

export const useJarvisStore = create((set) => ({
  jarvisState: 'idle',
  amplitude: 0,
  conversationId: null,
  messages: [],
  isSettingsOpen: false,
  isChatOpen: false,
  currentMemories: [],
  socketConnected: false,
  degradedMode: false,

  setJarvisState: (jarvisState) => set({ jarvisState }),
  setAmplitude: (amplitude) => set({ amplitude }),
  setConversationId: (conversationId) => set({ conversationId }),
  addMessage: (msg) =>
    set((s) => ({
      messages: [...s.messages, { ...msg, id: Date.now() + Math.random(), timestamp: new Date() }]
    })),
  toggleSettings: () => set((s) => ({ isSettingsOpen: !s.isSettingsOpen })),
  toggleChat: () => set((s) => ({ isChatOpen: !s.isChatOpen })),
  setMemories: (currentMemories) => set({ currentMemories }),
  setSocketConnected: (socketConnected) => set({ socketConnected }),
  setDegradedMode: (degradedMode) => set({ degradedMode }),
  reset: () =>
    set({
      jarvisState: 'idle',
      amplitude: 0,
      messages: []
    })
}));
