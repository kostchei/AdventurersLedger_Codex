import { create } from 'zustand';
import type { User, PBUser } from '../types';
import { pb } from '../lib/pb';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
  loginWithGoogle: () => Promise<void>;
  logout: () => void;
  fetchUser: () => void;
  setUser: (user: User | null) => void;
}

// Helper to map PocketBase record to our User interface
const mapPBUser = (record: PBUser | any): User | null => {
  if (!record) return null;

  return {
    id: record.id,
    email: record.email,
    name: record.name || record.username || 'Adventurer',
    avatarUrl: pb.files.getUrl(record, record.avatar),
    global_role: record.global_role,
    createdAt: record.created,
  };
};

export const useAuthStore = create<AuthState>((set) => {
  // Initialize state from existing authStore
  const initialUser = mapPBUser(pb.authStore.model);
  const initialToken = pb.authStore.token;

  // Listen for auth changes to keep Zustand in sync
  pb.authStore.onChange((token, model) => {
    set({
      user: mapPBUser(model),
      token,
      isAuthenticated: !!model,
    });
  }, true);

  return {
    user: initialUser,
    isAuthenticated: !!initialUser,
    isLoading: false,
    token: initialToken,

    loginWithGoogle: async () => {
      set({ isLoading: true });
      try {
        await pb.collection('users').authWithOAuth2({
          provider: 'google',
          scopes: ['profile', 'email'],
        });
        // onChange will handle the state update
      } catch (error) {
        console.error('Failed to login with Google:', error);
        throw error;
      } finally {
        set({ isLoading: false });
      }
    },

    logout: () => {
      pb.authStore.clear();
      // onChange will handle the state update
    },

    fetchUser: () => {
      // PocketBase handles persistence automatically via localStorage
      // But we can manually refresh if needed
      const model = pb.authStore.model;
      set({
        user: mapPBUser(model),
        isAuthenticated: !!model,
        token: pb.authStore.token,
        isLoading: false,
      });
    },

    setUser: (user: User | null) => {
      set({ user, isAuthenticated: !!user });
    },
  };
});
