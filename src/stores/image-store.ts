import type { ImageEntry } from '@/types/image';
import { invoke } from '@tauri-apps/api/core';
import { create } from 'zustand';

interface ImageState {
  images: ImageEntry[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  loadImages: (storageDir: string) => Promise<void>;
  uploadImage: (storageDir: string, sourcePath: string) => Promise<string>;
  deleteImage: (path: string, storageDir: string) => Promise<void>;
  clearError: () => void;
}

export const useImageStore = create<ImageState>()((set, get) => ({
  images: [],
  isLoading: false,
  error: null,

  loadImages: async (storageDir: string) => {
    set({ isLoading: true, error: null });
    try {
      const images = await invoke<ImageEntry[]>('list_images', { storageDir });
      set({ images, isLoading: false });
    } catch (error) {
      set({ error: String(error), isLoading: false });
    }
  },

  uploadImage: async (storageDir: string, sourcePath: string) => {
    set({ isLoading: true, error: null });
    try {
      const filename = await invoke<string>('save_image', { storageDir, sourcePath });
      // Reload the images list after upload
      await get().loadImages(storageDir);
      return filename;
    } catch (error) {
      set({ error: String(error), isLoading: false });
      throw error;
    }
  },

  deleteImage: async (imagePath: string, storageDir: string) => {
    set({ isLoading: true, error: null });
    try {
      await invoke<void>('delete_image', { imagePath });
      // Reload the images list after deletion
      await get().loadImages(storageDir);
    } catch (error) {
      set({ error: String(error), isLoading: false });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));
