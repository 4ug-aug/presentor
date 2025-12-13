import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const SLIDE_WIDTH = 1920;
const SLIDE_HEIGHT = 1080;

/**
 * Render a slide element to a canvas
 */
async function renderSlideToCanvas(
  slideHtml: string
): Promise<HTMLCanvasElement> {
  // Create a temporary container for rendering
  const container = document.createElement('div');
  container.style.cssText = `
    position: fixed;
    left: -9999px;
    top: 0;
    width: ${SLIDE_WIDTH}px;
    height: ${SLIDE_HEIGHT}px;
    overflow: hidden;
  `;
  
  // Create shadow DOM to isolate styles
  const wrapper = document.createElement('div');
  wrapper.className = 'slide-content';
  wrapper.innerHTML = slideHtml;
  wrapper.style.cssText = `
    width: ${SLIDE_WIDTH}px;
    height: ${SLIDE_HEIGHT}px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    background: var(--card, #242424);
    color: var(--foreground, #e8e6e3);
    font-family: Inter, system-ui, sans-serif;
    font-size: 48px;
    padding: 80px;
    box-sizing: border-box;
  `;
  
  container.appendChild(wrapper);
  document.body.appendChild(container);
  
  try {
    const canvas = await html2canvas(wrapper, {
      width: SLIDE_WIDTH,
      height: SLIDE_HEIGHT,
      scale: 2,
      backgroundColor: '#242424',
      logging: false,
    });
    return canvas;
  } finally {
    document.body.removeChild(container);
  }
}

export interface ExportOptions {
  title: string;
  slides: Array<{ html: string }>;
}

/**
 * Export presentation slides to PDF
 */
export async function exportToPdf(options: ExportOptions): Promise<boolean> {
  const { title, slides } = options;
  
  if (slides.length === 0) {
    throw new Error('No slides to export');
  }
  
  // Ask user for save location first
  const filePath = await save({
    defaultPath: `${title.replace(/[^a-z0-9]/gi, '-')}.pdf`,
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  });
  
  if (!filePath) {
    return false; // User cancelled
  }
  
  // Create PDF with landscape 16:9 aspect ratio
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'px',
    format: [SLIDE_WIDTH, SLIDE_HEIGHT],
    hotfixes: ['px_scaling'],
  });
  
  for (let i = 0; i < slides.length; i++) {
    const canvas = await renderSlideToCanvas(slides[i].html);
    const imgData = canvas.toDataURL('image/png');
    
    if (i > 0) {
      pdf.addPage([SLIDE_WIDTH, SLIDE_HEIGHT], 'landscape');
    }
    
    pdf.addImage(imgData, 'PNG', 0, 0, SLIDE_WIDTH, SLIDE_HEIGHT);
  }
  
  // Convert to bytes and save
  const pdfBytes = pdf.output('arraybuffer');
  await writeFile(filePath, new Uint8Array(pdfBytes));
  
  return true;
}
