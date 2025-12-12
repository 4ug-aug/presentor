import type { Presentation } from '@/types/presentation';
import { invoke } from '@tauri-apps/api/core';

export interface FileEntry {
  name: string;
  path: string;
  is_dir: boolean;
}

/**
 * List all presentation files in a directory
 */
export async function listPresentations(dirPath: string): Promise<FileEntry[]> {
  return invoke<FileEntry[]>('list_presentations', { dirPath });
}

/**
 * Read a presentation from disk
 */
export async function readPresentation(path: string): Promise<Presentation> {
  const content = await invoke<string>('read_presentation', { path });
  return JSON.parse(content) as Presentation;
}

/**
 * Save a presentation to disk
 */
export async function savePresentation(path: string, presentation: Presentation): Promise<void> {
  const content = JSON.stringify(presentation, null, 2);
  await invoke<void>('save_presentation', { path, content });
}

/**
 * Delete a presentation file
 */
export async function deletePresentation(path: string): Promise<void> {
  await invoke<void>('delete_presentation', { path });
}

/**
 * Generate a file path for a new presentation
 */
export function generatePresentationPath(storageDir: string, title: string): string {
  const safeName = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return `${storageDir}/${safeName || 'untitled'}-${Date.now()}.json`;
}

