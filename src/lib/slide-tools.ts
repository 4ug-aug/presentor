import { tool } from '@langchain/core/tools';
import { z } from 'zod';

/**
 * Tool definitions for the LLM to manipulate slides
 */

export const createSlideTool = tool(
  async ({ html, notes }) => {
    return JSON.stringify({ action: 'create_slide', html, notes });
  },
  {
    name: 'create_slide',
    description: 'Create a new slide with the given HTML content. The HTML should be wrapped in a <section class="slide"> element. Use semantic HTML like h1, h2, p, ul, li for content.',
    schema: z.object({
      html: z.string().describe('The HTML content for the slide, wrapped in <section class="slide">'),
      notes: z.string().optional().describe('Optional speaker notes for the slide'),
    }),
  }
);

export const updateSlideTool = tool(
  async ({ slideIndex, html, notes }) => {
    return JSON.stringify({ action: 'update_slide', slideIndex, html, notes });
  },
  {
    name: 'update_slide',
    description: 'Update an existing slide at the given index with new HTML content.',
    schema: z.object({
      slideIndex: z.number().describe('The 0-based index of the slide to update'),
      html: z.string().describe('The new HTML content for the slide'),
      notes: z.string().optional().describe('Optional new speaker notes'),
    }),
  }
);

export const deleteSlideTool = tool(
  async ({ slideIndex }) => {
    return JSON.stringify({ action: 'delete_slide', slideIndex });
  },
  {
    name: 'delete_slide',
    description: 'Delete the slide at the given index.',
    schema: z.object({
      slideIndex: z.number().describe('The 0-based index of the slide to delete'),
    }),
  }
);

export const getSlideInfoTool = tool(
  async ({ slideIndex }) => {
    return JSON.stringify({ action: 'get_slide_info', slideIndex });
  },
  {
    name: 'get_slide_info',
    description: 'Get information about the current slide or a specific slide by index.',
    schema: z.object({
      slideIndex: z.number().optional().describe('The 0-based index of the slide (omit for current slide)'),
    }),
  }
);

export const slideTools = [
  createSlideTool,
  updateSlideTool,
  deleteSlideTool,
  getSlideInfoTool,
];

export type SlideToolAction = 
  | { action: 'create_slide'; html: string; notes?: string }
  | { action: 'update_slide'; slideIndex: number; html: string; notes?: string }
  | { action: 'delete_slide'; slideIndex: number }
  | { action: 'get_slide_info'; slideIndex?: number };

export function parseToolResult(result: string): SlideToolAction {
  return JSON.parse(result) as SlideToolAction;
}
