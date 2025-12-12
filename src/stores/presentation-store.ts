import type { Presentation, PresentationMeta, Slide } from '@/types/presentation';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PresentationState {
  // Current presentation
  presentation: Presentation | null;
  currentSlideIndex: number;
  isEditing: boolean;
  
  // File state
  currentFilePath: string | null;
  hasUnsavedChanges: boolean;
  
  // Actions
  setPresentation: (presentation: Presentation) => void;
  setCurrentSlide: (index: number) => void;
  setEditing: (editing: boolean) => void;
  
  // Slide operations
  addSlide: (slide?: Partial<Slide>) => void;
  updateSlide: (index: number, updates: Partial<Slide>) => void;
  deleteSlide: (index: number) => void;
  moveSlide: (fromIndex: number, toIndex: number) => void;
  
  // Presentation operations
  updateMeta: (meta: Partial<PresentationMeta>) => void;
  newPresentation: (title?: string) => void;
  setFilePath: (path: string | null) => void;
  markSaved: () => void;
  
  // Navigation
  nextSlide: () => void;
  prevSlide: () => void;
}

const createDefaultSlide = (): Slide => ({
  id: `slide-${Date.now()}`,
  html: `<section class="slide">
    <h1>New Slide</h1>
    <p>Click to edit or use AI to generate content</p>
  </section>`,
  notes: '',
});

const createDefaultPresentation = (title: string = 'Untitled Presentation'): Presentation => ({
  meta: {
    title,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    theme: 'dark-corporate',
  },
  slides: [createDefaultSlide()],
});

export const usePresentationStore = create<PresentationState>()(
  persist(
    (set, get) => ({
      presentation: null,
      currentSlideIndex: 0,
      isEditing: false,
      currentFilePath: null,
      hasUnsavedChanges: false,

      setPresentation: (presentation) => set({ 
        presentation, 
        currentSlideIndex: 0,
        hasUnsavedChanges: false,
      }),

      setCurrentSlide: (index) => {
        const { presentation } = get();
        if (presentation && index >= 0 && index < presentation.slides.length) {
          set({ currentSlideIndex: index });
        }
      },

      setEditing: (isEditing) => set({ isEditing }),

      addSlide: (slideData) => {
        const { presentation, currentSlideIndex } = get();
        if (!presentation) return;

        const newSlide: Slide = {
          ...createDefaultSlide(),
          ...slideData,
          id: `slide-${Date.now()}`,
        };

        const newSlides = [...presentation.slides];
        newSlides.splice(currentSlideIndex + 1, 0, newSlide);

        set({
          presentation: {
            ...presentation,
            slides: newSlides,
            meta: { ...presentation.meta, updatedAt: new Date().toISOString() },
          },
          currentSlideIndex: currentSlideIndex + 1,
          hasUnsavedChanges: true,
        });
      },

      updateSlide: (index, updates) => {
        const { presentation } = get();
        if (!presentation || index < 0 || index >= presentation.slides.length) return;

        const newSlides = [...presentation.slides];
        newSlides[index] = { ...newSlides[index], ...updates };

        set({
          presentation: {
            ...presentation,
            slides: newSlides,
            meta: { ...presentation.meta, updatedAt: new Date().toISOString() },
          },
          hasUnsavedChanges: true,
        });
      },

      deleteSlide: (index) => {
        const { presentation, currentSlideIndex } = get();
        if (!presentation || presentation.slides.length <= 1) return;

        const newSlides = presentation.slides.filter((_, i) => i !== index);
        const newIndex = Math.min(currentSlideIndex, newSlides.length - 1);

        set({
          presentation: {
            ...presentation,
            slides: newSlides,
            meta: { ...presentation.meta, updatedAt: new Date().toISOString() },
          },
          currentSlideIndex: newIndex,
          hasUnsavedChanges: true,
        });
      },

      moveSlide: (fromIndex, toIndex) => {
        const { presentation } = get();
        if (!presentation) return;

        const newSlides = [...presentation.slides];
        const [removed] = newSlides.splice(fromIndex, 1);
        newSlides.splice(toIndex, 0, removed);

        set({
          presentation: {
            ...presentation,
            slides: newSlides,
            meta: { ...presentation.meta, updatedAt: new Date().toISOString() },
          },
          hasUnsavedChanges: true,
        });
      },

      updateMeta: (meta) => {
        const { presentation } = get();
        if (!presentation) return;

        set({
          presentation: {
            ...presentation,
            meta: { 
              ...presentation.meta, 
              ...meta, 
              updatedAt: new Date().toISOString() 
            },
          },
          hasUnsavedChanges: true,
        });
      },

      newPresentation: (title) => set({
        presentation: createDefaultPresentation(title),
        currentSlideIndex: 0,
        currentFilePath: null,
        hasUnsavedChanges: false,
        isEditing: false,
      }),

      setFilePath: (path) => set({ currentFilePath: path }),

      markSaved: () => set({ hasUnsavedChanges: false }),

      nextSlide: () => {
        const { presentation, currentSlideIndex } = get();
        if (presentation && currentSlideIndex < presentation.slides.length - 1) {
          set({ currentSlideIndex: currentSlideIndex + 1 });
        }
      },

      prevSlide: () => {
        const { currentSlideIndex } = get();
        if (currentSlideIndex > 0) {
          set({ currentSlideIndex: currentSlideIndex - 1 });
        }
      },
    }),
    {
      name: 'presentation-storage',
      partialize: (state) => ({
        presentation: state.presentation,
        currentFilePath: state.currentFilePath,
      }),
    }
  )
);
