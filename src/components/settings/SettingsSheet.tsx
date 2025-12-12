import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { requiresApiKey, requiresBaseUrl } from '@/lib/ai-service';
import { useSettingsStore } from '@/stores';
import { DEFAULT_MODELS, type LLMProvider } from '@/types/presentation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const settingsSchema = z.object({
  provider: z.enum(['openai', 'ollama', 'google', 'vllm']),
  apiKey: z.string().optional(),
  baseUrl: z.string().optional(),
  modelName: z.string().min(1, 'Model name is required'),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

interface SettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsSheet({ open, onOpenChange }: SettingsSheetProps) {
  const { config, updateConfig } = useSettingsStore();

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: config,
  });

  const provider = form.watch('provider') as LLMProvider;
  const needsApiKey = requiresApiKey(provider);
  const needsBaseUrl = requiresBaseUrl(provider);

  const onSubmit = (data: SettingsFormData) => {
    updateConfig(data);
    onOpenChange(false);
  };

  const handleProviderChange = (value: LLMProvider) => {
    form.setValue('provider', value);
    
    // Set defaults based on provider
    if (value === 'ollama') {
      form.setValue('baseUrl', 'http://localhost:11434');
      form.setValue('modelName', 'llama3.2');
    } else if (value === 'vllm') {
      form.setValue('baseUrl', 'http://localhost:8000/v1');
    } else if (value === 'openai') {
      form.setValue('modelName', 'gpt-4o-mini');
    } else if (value === 'google') {
      form.setValue('modelName', 'gemini-1.5-flash');
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="border-zinc-800 bg-zinc-950 text-zinc-200">
        <SheetHeader>
          <SheetTitle className="text-zinc-100">Settings</SheetTitle>
          <SheetDescription className="text-zinc-500">
            Configure your AI provider
          </SheetDescription>
        </SheetHeader>

        <div className="m-4 space-y-4">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Provider */}
            <div className="space-y-2">
              <Label className="text-xs text-zinc-400">Provider</Label>
              <Select
                value={provider}
                onValueChange={handleProviderChange}
              >
                <SelectTrigger className="border-zinc-800 bg-zinc-900 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-zinc-800 bg-zinc-900">
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="google">Google</SelectItem>
                  <SelectItem value="ollama">Ollama (Local)</SelectItem>
                  <SelectItem value="vllm">vLLM (Local)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* API Key */}
            {needsApiKey && (
              <div className="space-y-2">
                <Label className="text-xs text-zinc-400">API Key</Label>
                <Input
                  type="password"
                  {...form.register('apiKey')}
                  className="border-zinc-800 bg-zinc-900 font-mono text-sm"
                  placeholder="sk-..."
                />
              </div>
            )}

            {/* Base URL */}
            {needsBaseUrl && (
              <div className="space-y-2">
                <Label className="text-xs text-zinc-400">Base URL</Label>
                <Input
                  {...form.register('baseUrl')}
                  className="border-zinc-800 bg-zinc-900 font-mono text-sm"
                  placeholder="http://localhost:11434"
                />
              </div>
            )}

            {/* Model */}
            <div className="space-y-2">
              <Label className="text-xs text-zinc-400">Model</Label>
              <Select
                value={form.watch('modelName')}
                onValueChange={(v) => form.setValue('modelName', v)}
              >
                <SelectTrigger className="border-zinc-800 bg-zinc-900 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-zinc-800 bg-zinc-900">
                  {DEFAULT_MODELS[provider]?.map((model) => (
                    <SelectItem key={model} value={model}>
                      {model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              type="submit"
              className="w-full bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
            >
              Save
            </Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
