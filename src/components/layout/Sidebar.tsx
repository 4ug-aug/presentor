import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    deletePresentation,
    generatePresentationPath,
    listPresentations,
    readPresentation,
    savePresentation,
    type FileEntry
} from '@/lib/file-service';
import { cn } from '@/lib/utils';
import { usePresentationStore, useSettingsStore } from '@/stores';
import { FileText, FolderOpen, Plus, Save, Settings, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

interface SidebarProps {
  onOpenSettings: () => void;
}

export function Sidebar({ onOpenSettings }: SidebarProps) {
  const { 
    presentation, 
    currentSlideIndex, 
    currentFilePath,
    hasUnsavedChanges,
    setCurrentSlide, 
    addSlide,
    deleteSlide,
    newPresentation,
    setPresentation,
    setFilePath,
    markSaved,
  } = usePresentationStore();

  const { storageDirectory } = useSettingsStore();

  const [files, setFiles] = useState<FileEntry[]>([]);
  const [showFiles, setShowFiles] = useState(false);
  const [slideToDelete, setSlideToDelete] = useState<number | null>(null);

  useEffect(() => {
    if (showFiles && storageDirectory) {
      loadFiles();
    }
  }, [showFiles, storageDirectory]);

  const loadFiles = async () => {
    if (!storageDirectory) return;
    try {
      const entries = await listPresentations(storageDirectory);
      setFiles(entries);
    } catch (err) {
      console.error('Failed to load files:', err);
    }
  };

  const handleSave = async () => {
    if (!presentation || !storageDirectory) return;
    try {
      const path = currentFilePath ?? generatePresentationPath(storageDirectory, presentation.meta.title);
      await savePresentation(path, presentation);
      setFilePath(path);
      markSaved();
    } catch (err) {
      console.error('Failed to save:', err);
    }
  };

  const handleOpen = async (file: FileEntry) => {
    try {
      const pres = await readPresentation(file.path);
      setPresentation(pres);
      setFilePath(file.path);
      setShowFiles(false);
    } catch (err) {
      console.error('Failed to open:', err);
    }
  };

  const handleDelete = async (file: FileEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deletePresentation(file.path);
      await loadFiles();
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  return (
    <div className="flex h-full flex-col bg-zinc-950 text-zinc-300">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2">
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          {showFiles ? 'Files' : 'Slides'}
        </span>
        <div className="flex gap-1">
          {presentation && (
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-6 w-6",
                hasUnsavedChanges ? "text-amber-500 hover:text-amber-400" : "text-zinc-500 hover:text-zinc-300"
              )}
              onClick={handleSave}
              title="Save"
            >
              <Save className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-zinc-500 hover:text-zinc-300"
            onClick={() => setShowFiles(!showFiles)}
            title={showFiles ? "Show slides" : "Browse files"}
          >
            <FolderOpen className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-zinc-500 hover:text-zinc-300"
            onClick={() => presentation ? addSlide() : newPresentation()}
            title={presentation ? "Add slide" : "New presentation"}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-zinc-500 hover:text-zinc-300"
            onClick={onOpenSettings}
            title="Settings"
          >
            <Settings className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {showFiles ? (
            // File browser
            <div className="space-y-1">
              {files.length === 0 ? (
                <p className="px-2 py-4 text-center text-xs text-zinc-600">
                  No presentations yet
                </p>
              ) : (
                files.map((file) => (
                  <button
                    key={file.path}
                    onClick={() => handleOpen(file)}
                    className="group flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="truncate">{file.name.replace('.json', '')}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400"
                      onClick={(e) => handleDelete(file, e)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </button>
                ))
              )}
            </div>
          ) : !presentation ? (
            // No presentation loaded
            <button
              onClick={() => newPresentation()}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>New presentation</span>
            </button>
          ) : (
            // Slide list
            <div className="space-y-1">
              {presentation.slides.map((slide, index) => (
                <ContextMenu key={slide.id}>
                  <ContextMenuTrigger asChild>
                    <button
                      onClick={() => setCurrentSlide(index)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors",
                        currentSlideIndex === index
                          ? "bg-zinc-800 text-zinc-100"
                          : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-300"
                      )}
                    >
                      <span className="font-mono text-zinc-600">{index + 1}</span>
                      <span className="truncate">
                        {extractSlideTitle(slide.html) || `Slide ${index + 1}`}
                      </span>
                    </button>
                  </ContextMenuTrigger>
                  <ContextMenuContent className="w-44">
                    <ContextMenuItem
                      variant="destructive"
                      disabled={presentation.slides.length <= 1}
                      onClick={() => setSlideToDelete(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete slide
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      {presentation && !showFiles && (
        <div className="border-t border-zinc-800 px-3 py-2">
          <p className="truncate text-xs text-zinc-600">
            {presentation.meta.title}
            {hasUnsavedChanges && <span className="ml-1 text-amber-500">•</span>}
          </p>
        </div>
      )}

      {/* Delete Slide Confirmation Dialog */}
      <AlertDialog open={slideToDelete !== null} onOpenChange={(open) => !open && setSlideToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Slide</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {slideToDelete !== null ? (
                <>
                  <strong>Slide {slideToDelete + 1}</strong>
                  {presentation && extractSlideTitle(presentation.slides[slideToDelete]?.html) && (
                    <> ({extractSlideTitle(presentation.slides[slideToDelete].html)})</>
                  )}
                </>
              ) : 'this slide'}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (slideToDelete !== null) {
                  deleteSlide(slideToDelete);
                  setSlideToDelete(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function extractSlideTitle(html: string): string | null {
  const match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  return match ? match[1].trim() : null;
}
