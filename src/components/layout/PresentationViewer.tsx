import { Button } from '@/components/ui/button';
import { usePresentationStore } from '@/stores';
import DOMPurify from 'dompurify';
import { ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';

export function PresentationViewer() {
  const { presentation, currentSlideIndex, nextSlide, prevSlide } = usePresentationStore();

  const currentSlide = presentation?.slides[currentSlideIndex];

  return (
    <div className="flex h-full flex-col bg-zinc-900">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-1.5">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-zinc-500 hover:text-zinc-300"
            onClick={prevSlide}
            disabled={currentSlideIndex === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[4rem] text-center font-mono text-xs text-zinc-500">
            {presentation ? `${currentSlideIndex + 1} / ${presentation.slides.length}` : '–'}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-zinc-500 hover:text-zinc-300"
            onClick={nextSlide}
            disabled={!presentation || currentSlideIndex >= presentation.slides.length - 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-zinc-500 hover:text-zinc-300"
          title="Present"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Canvas */}
      <div className="flex flex-1 items-center justify-center overflow-auto p-4">
        {currentSlide ? (
          <div className="aspect-video w-full max-w-4xl overflow-hidden rounded border border-zinc-800 bg-zinc-950 shadow-2xl">
            <div
              className="slide-content h-full w-full p-8"
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(currentSlide.html),
              }}
            />
          </div>
        ) : (
          <div className="text-center text-zinc-600">
            <p className="text-sm">No presentation loaded</p>
            <p className="mt-1 text-xs">Create a new presentation from the sidebar</p>
          </div>
        )}
      </div>
    </div>
  );
}
