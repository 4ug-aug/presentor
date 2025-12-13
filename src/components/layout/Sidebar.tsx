import { useTheme } from '@/components/theme/theme-provider';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { exportToPdf } from '@/lib/export-service';
import {
  deletePresentation,
  generatePresentationPath,
  listPresentations,
  readPresentation,
  savePresentation,
  type FileEntry,
} from '@/lib/file-service';
import { cn } from '@/lib/utils';
import { usePresentationStore, useSettingsStore } from '@/stores';
import { Edit3, FileDown, FilePlus2, FileText, FolderOpen, Loader2, Monitor, Moon, Plus, Save, Settings, Sun, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

interface SidebarProps {
  onOpenSettings: () => void;
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  
  const cycleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };
  
  return (
    <TooltipProvider>
      <Tooltip>
      <TooltipTrigger>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground"
          onClick={cycleTheme}
          title={`Theme: ${theme}`}
        >
          {theme === 'light' && <Sun className="h-3.5 w-3.5" />}
          {theme === 'dark' && <Moon className="h-3.5 w-3.5" />}
          {theme === 'system' && <Monitor className="h-3.5 w-3.5" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Toggle theme (Current: {theme})</p>
      </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
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
    updateMeta,
    setPresentation,
    setFilePath,
    markSaved,
  } = usePresentationStore();

  const { storageDirectory } = useSettingsStore();

  const [files, setFiles] = useState<FileEntry[]>([]);
  const [showFiles, setShowFiles] = useState(false);
  const [slideToDelete, setSlideToDelete] = useState<number | null>(null);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [titleInput, setTitleInput] = useState('');
  const [isExporting, setIsExporting] = useState(false);

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

  const handleExport = async () => {
    if (!presentation) return;
    setIsExporting(true);
    try {
      const success = await exportToPdf({
        title: presentation.meta.title,
        slides: presentation.slides,
      });
      if (success) {
        console.log('PDF exported successfully');
      }
    } catch (err) {
      console.error('Failed to export PDF:', err);
      alert(`Export failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex gap-1">
          {presentation && (
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-6 w-6",
                hasUnsavedChanges ? "text-amber-500 hover:text-amber-400" : "text-muted-foreground"
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
            className="h-6 w-6 text-muted-foreground"
            onClick={() => setShowFiles(!showFiles)}
            title={showFiles ? "Show slides" : "Browse files"}
          >
            <FolderOpen className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground"
            onClick={() => {
              setTitleInput('');
              setShowNewDialog(true);
            }}
            title="New presentation"
          >
            <FilePlus2 className="h-3.5 w-3.5" />
          </Button>
          {presentation && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground"
              onClick={() => addSlide()}
              title="Add slide"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          )}
          {presentation && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground"
              onClick={handleExport}
              disabled={isExporting}
              title="Export to PDF"
            >
              {isExporting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileDown className="h-3.5 w-3.5" />
              )}
            </Button>
          )}
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground"
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
                <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                  No presentations yet
                </p>
              ) : (
                files.map((file) => (
                  <button
                    key={file.path}
                    onClick={() => handleOpen(file)}
                    className="group flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="truncate">{file.name.replace('.json', '')}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400"
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
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs"
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
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground"
                      )}
                    >
                      <span className="font-mono text-muted-foreground">{index + 1}</span>
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
        <div className="border-t border-border px-3 py-2">
          <button
            onClick={() => {
              setTitleInput(presentation.meta.title);
              setShowRenameDialog(true);
            }}
            className="group flex w-full items-center gap-1.5 text-left"
          >
            <p className="truncate text-xs text-muted-foreground group-hover:text-foreground transition-colors">
              {presentation.meta.title}
            </p>
            <Edit3 className="h-2.5 w-2.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
            {hasUnsavedChanges && <span className="text-amber-500">•</span>}
          </button>
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

      {/* New Presentation Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Presentation</DialogTitle>
            <DialogDescription>
              Give your presentation a name
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="new-title" className="text-sm">Title</Label>
            <Input
              id="new-title"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              placeholder="My Presentation"
              className="mt-1.5"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  newPresentation(titleInput.trim() || 'Untitled Presentation');
                  setShowNewDialog(false);
                }
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                newPresentation(titleInput.trim() || 'Untitled Presentation');
                setShowNewDialog(false);
              }}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Presentation Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Presentation</DialogTitle>
            <DialogDescription>
              Enter a new name for your presentation
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="rename-title" className="text-sm">Title</Label>
            <Input
              id="rename-title"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              placeholder="My Presentation"
              className="mt-1.5"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && titleInput.trim()) {
                  updateMeta({ title: titleInput.trim() });
                  setShowRenameDialog(false);
                }
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRenameDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (titleInput.trim()) {
                  updateMeta({ title: titleInput.trim() });
                  setShowRenameDialog(false);
                }
              }}
              disabled={!titleInput.trim()}
            >
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function extractSlideTitle(html: string): string | null {
  const match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  return match ? match[1].trim() : null;
}
