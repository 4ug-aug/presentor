import { EditableSlide } from '@/components/slides/EditableSlide';
import { Button } from '@/components/ui/button';
import { usePresentationStore } from '@/stores';
import { ChevronLeft, ChevronRight, Maximize2, Minimize2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

export function PresentationViewer() {
  const { presentation, currentSlideIndex, updateSlide, nextSlide, prevSlide } = usePresentationStore();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentSlide = presentation?.slides[currentSlideIndex];

  const enterFullscreen = useCallback(async () => {
    if (containerRef.current) {
      try {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } catch (err) {
        console.error('Failed to enter fullscreen:', err);
      }
    }
  }, []);

  const exitFullscreen = useCallback(async () => {
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
        setIsFullscreen(false);
      } catch (err) {
        console.error('Failed to exit fullscreen:', err);
      }
    }
  }, []);

  // Handle fullscreen change events (e.g., pressing Escape)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Handle keyboard navigation in fullscreen
  useEffect(() => {
    if (!isFullscreen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        nextSlide();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevSlide();
      } else if (e.key === 'Escape') {
        exitFullscreen();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, nextSlide, prevSlide, exitFullscreen]);

  return (
    <div ref={containerRef} className={`flex h-full flex-col ${isFullscreen ? 'bg-black' : ''}`}>
      {/* Toolbar - hidden in fullscreen */}
      {!isFullscreen && (
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
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground"
            onClick={enterFullscreen}
            title="Present fullscreen"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Canvas */}
      <div className={`flex flex-1 items-center justify-center overflow-auto ${isFullscreen ? 'p-0' : 'p-4'}`}>
        {currentSlide ? (
          <div 
            className={`overflow-hidden shadow-2xl ${
              isFullscreen 
                ? 'h-full w-full' 
                : 'aspect-video w-full max-w-4xl'
            }`}
          >
            <EditableSlide
              html={currentSlide.html}
              onUpdate={(newHtml) => updateSlide(currentSlideIndex, { html: newHtml })}
              disabled={isFullscreen}
            />
          </div>
        ) : (
          <div className="text-center text-muted-foreground">
            <p className="text-sm">No presentation loaded</p>
            <p className="mt-1 text-xs">Create a new presentation from the sidebar</p>
          </div>
        )}
      </div>

      {/* Fullscreen controls overlay */}
      {isFullscreen && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 rounded-full bg-black/50 px-4 py-2 backdrop-blur-sm opacity-0 hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10"
            onClick={prevSlide}
            disabled={currentSlideIndex === 0}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <span className="min-w-[4rem] text-center font-mono text-sm text-white/70">
            {presentation ? `${currentSlideIndex + 1} / ${presentation.slides.length}` : '–'}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10"
            onClick={nextSlide}
            disabled={!presentation || currentSlideIndex >= presentation.slides.length - 1}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
          <div className="w-px h-6 bg-white/20" />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10"
            onClick={exitFullscreen}
            title="Exit fullscreen"
          >
            <Minimize2 className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

