import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useUserStore = create(
  persist(
    (set, get) => ({
      avatarCache: {},
      messageReactions: {},
      
      setAvatarCache: (userId, avatarData) => {
        set((state) => ({
          avatarCache: { ...state.avatarCache, [userId]: avatarData }
        }));
      },
      
      getAvatarCache: (userId) => {
        return get().avatarCache[userId] || null;
      },
      
      addReaction: (messageId, userId, reaction) => {
        set((state) => {
          const messageReactions = { ...state.messageReactions };
          const currentReactions = messageReactions[messageId] || [];
          
          const existingIndex = currentReactions.findIndex(r => r.userId === userId);
          if (existingIndex !== -1) {
            if (currentReactions[existingIndex].reaction === reaction) {
              currentReactions.splice(existingIndex, 1);
            } else {
              currentReactions[existingIndex] = { userId, reaction };
            }
          } else {
            currentReactions.push({ userId, reaction });
          }
          
          messageReactions[messageId] = currentReactions;
          return { messageReactions };
        });
      },
      
      getMessageReactions: (messageId) => {
        return get().messageReactions[messageId] || [];
      },
      
      clearMessageReactions: (messageId) => {
        set((state) => {
          const messageReactions = { ...state.messageReactions };
          delete messageReactions[messageId];
          return { messageReactions };
        });
      }
    }),
    {
      name: 'messenger-user-data'
    }
  )
);

export default useUserStore;