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

// Image-related types and functions
export interface ImageEntry {
  name: string;
  path: string;
}

/**
 * List all images in the images directory
 */
export async function listImages(storageDir: string): Promise<ImageEntry[]> {
  return invoke<ImageEntry[]>('list_images', { storageDir });
}

/**
 * Save an image to the images directory
 * Returns the filename of the saved image
 */
export async function saveImage(storageDir: string, sourcePath: string): Promise<string> {
  return invoke<string>('save_image', { storageDir, sourcePath });
}

/**
 * Delete an image from the images directory
 */
export async function deleteImage(imagePath: string): Promise<void> {
  return invoke<void>('delete_image', { imagePath });
}

/**
 * Get the images directory path
 */
export function getImagesDirectory(storageDir: string): string {
  return `${storageDir}/images`;
}
