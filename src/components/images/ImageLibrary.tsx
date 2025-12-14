import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useImageStore } from '@/stores/image-store';
import { useSettingsStore } from '@/stores/settings-store';
import { convertFileSrc } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { Check, Copy, ImageIcon, Loader2, Trash2, Upload } from 'lucide-react';
import { useEffect, useState } from 'react';

export function ImageLibrary() {
  const [isOpen, setIsOpen] = useState(false);
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const { images, isLoading, loadImages, uploadImage, deleteImage } = useImageStore();
  const { storageDirectory } = useSettingsStore();

  useEffect(() => {
    if (isOpen && storageDirectory) {
      loadImages(storageDirectory);
    }
  }, [isOpen, storageDirectory, loadImages]);

  const handleUpload = async () => {
    if (!storageDirectory) return;

    const selected = await open({
      multiple: true,
      filters: [
        {
          name: 'Images',
          extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'],
        },
      ],
    });

    if (selected) {
      const paths = Array.isArray(selected) ? selected : [selected];
      for (const path of paths) {
        try {
          await uploadImage(storageDirectory, path);
        } catch (error) {
          console.error('Failed to upload image:', error);
        }
      }
    }
  };

  const handleDelete = async (imagePath: string) => {
    if (!storageDirectory) return;
    
    try {
      await deleteImage(imagePath, storageDirectory);
    } catch (error) {
      console.error('Failed to delete image:', error);
    }
  };

  const copyImageUrl = (imagePath: string) => {
    const assetUrl = convertFileSrc(imagePath);
    navigator.clipboard.writeText(assetUrl);
    setCopiedPath(imagePath);
    setTimeout(() => setCopiedPath(null), 2000);
  };

  const getImageSrc = (path: string): string => {
    // Use Tauri's convertFileSrc for proper asset protocol URL
    return convertFileSrc(path);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground"
          title="Image Library"
        >
          <ImageIcon className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader className="space-y-1">
          <div className="flex items-center justify-between">
            <DialogTitle>Image Library</DialogTitle>
            <Button
              size="sm"
              onClick={handleUpload}
              disabled={isLoading || !storageDirectory}
              className="gap-1.5"
            >
              {isLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5" />
              )}
              Upload
            </Button>
          </div>
          <DialogDescription>
            Upload images to use in your slides. Click to copy the URL.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          {!storageDirectory ? (
            <div className="flex h-[300px] items-center justify-center rounded-lg border border-dashed border-border bg-muted/30">
              <div className="text-center">
                <ImageIcon className="mx-auto h-10 w-10 text-muted-foreground/50" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Configure a storage directory in settings first
                </p>
              </div>
            </div>
          ) : images.length === 0 ? (
            <div 
              className="flex h-[300px] cursor-pointer items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 transition-colors hover:border-primary/50 hover:bg-muted/50"
              onClick={handleUpload}
            >
              <div className="text-center">
                <Upload className="mx-auto h-10 w-10 text-muted-foreground/50" />
                <p className="mt-2 text-sm font-medium">No images yet</p>
                <p className="text-xs text-muted-foreground">Click to upload images</p>
              </div>
            </div>
          ) : (
            <ScrollArea className="h-[400px] pr-3">
              <div className="grid grid-cols-3 gap-4">
                {images.map((image) => (
                  <div
                    key={image.path}
                    className="group relative overflow-hidden rounded-lg border border-border bg-muted/30 transition-all hover:border-primary/50 hover:shadow-md"
                  >
                    {/* Image container */}
                    <div 
                      className="aspect-square cursor-pointer overflow-hidden"
                      onClick={() => copyImageUrl(image.path)}
                    >
                      <img
                        src={getImageSrc(image.path)}
                        alt={image.name}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                        onError={(e) => {
                          // Fallback for broken images
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.parentElement!.innerHTML = `
                            <div class="flex h-full w-full items-center justify-center bg-muted">
                              <svg class="h-8 w-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          `;
                        }}
                      />
                    </div>
                    
                    {/* Info bar */}
                    <div className="flex items-center justify-between border-t border-border bg-background/80 px-2 py-1.5">
                      <span className="truncate text-xs text-muted-foreground">
                        {image.name}
                      </span>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => copyImageUrl(image.path)}
                          title="Copy URL"
                        >
                          {copiedPath === image.path ? (
                            <Check className="h-3 w-3 text-green-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-red-500 hover:text-red-600"
                          onClick={() => handleDelete(image.path)}
                          title="Delete"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
