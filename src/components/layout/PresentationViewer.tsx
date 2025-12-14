import { EditableSlide } from '@/components/slides/EditableSlide';
import { ScaledSlide } from '@/components/slides/ScaledSlide';
import { Button } from '@/components/ui/button';
import { usePresentationStore } from '@/stores';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function PresentationViewer() {
  const { presentation, currentSlideIndex, updateSlide, nextSlide, prevSlide } = usePresentationStore();

  const currentSlide = presentation?.slides[currentSlideIndex];

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-border px-2 py-2">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground"
            onClick={prevSlide}
            disabled={currentSlideIndex === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[4rem] text-center font-mono text-xs">
            {presentation ? `${currentSlideIndex + 1} / ${presentation.slides.length}` : '–'}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground"
            onClick={nextSlide}
            disabled={!presentation || currentSlideIndex >= presentation.slides.length - 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Canvas Area - Uses ScaledSlide for pixel-perfect preview matching PDF */}
      <div className="flex flex-1 items-center justify-center overflow-hidden bg-muted p-4">
        {currentSlide ? (
          <div className="w-full h-full max-w-5xl">
            <ScaledSlide width={1280} height={720}>
              <EditableSlide
                html={currentSlide.html}
                onUpdate={(newHtml) => updateSlide(currentSlideIndex, { html: newHtml })}
                disabled={false}
              />
            </ScaledSlide>
          </div>
        ) : (
          <div className="text-center text-muted-foreground">
            <p className="text-sm">No presentation loaded</p>
            <p className="mt-1 text-xs">Create a new presentation from the sidebar</p>
          </div>
        )}
      </div>
    </div>
  );
}
