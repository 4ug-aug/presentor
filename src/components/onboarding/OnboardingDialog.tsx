import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSettingsStore } from '@/stores';
import { open } from '@tauri-apps/plugin-dialog';
import { FolderOpen } from 'lucide-react';
import { useState } from 'react';

export function OnboardingDialog() {
  const { isOnboarded, setStorageDirectory, completeOnboarding } = useSettingsStore();
  const [selectedPath, setSelectedPath] = useState<string>('');
  const [error, setError] = useState<string>('');

  const handleBrowse = async () => {
    try {
      const result = await open({
        directory: true,
        multiple: false,
        title: 'Select Storage Directory',
      });
      
      if (result) {
        setSelectedPath(result as string);
        setError('');
      }
    } catch (err) {
      setError('Failed to open folder picker');
    }
  };

  const handleContinue = () => {
    if (!selectedPath) {
      setError('Please select a directory');
      return;
    }
    setStorageDirectory(selectedPath);
    completeOnboarding();
  };

  return (
    <Dialog open={!isOnboarded}>
      <DialogContent showCloseButton={false} className="border-zinc-800 bg-zinc-950 text-zinc-200">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">Welcome to Presentor</DialogTitle>
          <DialogDescription className="text-zinc-500">
            Choose where to store your presentations
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-xs text-zinc-400">Storage Directory</Label>
            <div className="flex gap-2">
              <Input
                value={selectedPath}
                onChange={(e) => setSelectedPath(e.target.value)}
                placeholder="/path/to/presentations"
                className="flex-1 border-zinc-800 bg-zinc-900 font-mono text-sm"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleBrowse}
                className="border-zinc-800 bg-zinc-900 hover:bg-zinc-800"
              >
                <FolderOpen className="h-4 w-4" />
              </Button>
            </div>
            {error && (
              <p className="text-xs text-red-400">{error}</p>
            )}
          </div>

          <p className="text-xs text-zinc-600">
            All your presentations will be saved as JSON files in this directory.
          </p>
        </div>

        <Button
          onClick={handleContinue}
          className="w-full bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
        >
          Continue
        </Button>
      </DialogContent>
    </Dialog>
  );
}
