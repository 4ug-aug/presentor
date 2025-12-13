import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useImageStore } from '@/stores/image-store';
import { useSettingsStore } from '@/stores/settings-store';
import { convertFileSrc } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { Copy, Image, Trash2, Upload } from 'lucide-react';
import { useEffect, useState } from 'react';

export function ImageLibrary() {
  const [isOpen, setIsOpen] = useState(false);
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

  const copyImagePath = (imagePath: string) => {
    // Convert to asset URL for use in slides
    const assetUrl = convertFileSrc(imagePath);
    navigator.clipboard.writeText(assetUrl);
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
          <Image className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Image Library</span>
            <Button
              size="sm"
              onClick={handleUpload}
              disabled={isLoading || !storageDirectory}
              className="gap-1.5"
            >
              <Upload className="h-3.5 w-3.5" />
              Upload
            </Button>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[400px] w-full">
          {!storageDirectory ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Please configure a storage directory in settings
            </div>
          ) : images.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
              <Image className="h-12 w-12 opacity-30" />
              <p className="text-sm">No images yet</p>
              <p className="text-xs">Upload images to use in your slides</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3 p-1">
              {images.map((image) => (
                <div
                  key={image.path}
                  className="group relative aspect-square overflow-hidden rounded-md border border-border bg-muted"
                >
                  <img
                    src={convertFileSrc(image.path)}
                    alt={image.name}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-end justify-center gap-1 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => copyImagePath(image.path)}
                      title="Copy URL"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleDelete(image.path)}
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <p className="absolute bottom-0 left-0 right-0 truncate bg-black/40 px-2 py-1 text-xs text-white opacity-0 group-hover:opacity-100">
                    {image.name}
                  </p>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
