import { save } from '@tauri-apps/plugin-dialog';
import { readFile, writeFile } from '@tauri-apps/plugin-fs';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

// Use smaller dimensions for export to reduce file size
const SLIDE_WIDTH = 1280;
const SLIDE_HEIGHT = 720;

/**
 * Convert asset:// URLs to data URLs so html2canvas can render them
 */
async function convertImagesToDataUrls(html: string): Promise<string> {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const images = doc.querySelectorAll('img');
  
  for (const img of images) {
    const src = img.getAttribute('src');
    if (src && (src.startsWith('asset://') || src.startsWith('https://asset.localhost'))) {
      try {
        // Extract the file path from the asset URL
        // asset://localhost/path/to/file or https://asset.localhost/path/to/file
        let filePath = src;
        if (src.startsWith('asset://localhost/')) {
          filePath = '/' + src.replace('asset://localhost/', '');
        } else if (src.startsWith('https://asset.localhost/')) {
          filePath = '/' + src.replace('https://asset.localhost/', '');
        }
        
        // Read the file and convert to base64
        const fileData = await readFile(filePath);
        const base64 = btoa(String.fromCharCode(...fileData));
        
        // Determine MIME type from extension
        const ext = filePath.split('.').pop()?.toLowerCase() || 'png';
        const mimeTypes: Record<string, string> = {
          'png': 'image/png',
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'gif': 'image/gif',
          'webp': 'image/webp',
          'svg': 'image/svg+xml',
        };
        const mimeType = mimeTypes[ext] || 'image/png';
        
        img.setAttribute('src', `data:${mimeType};base64,${base64}`);
      } catch (err) {
        console.warn('Failed to convert image to data URL:', src, err);
      }
    }
  }
  
  return doc.body.innerHTML;
}

/**
 * Render a slide element to a canvas
 */
async function renderSlideToCanvas(
  slideHtml: string,
  slideIndex: number,
  totalSlides: number,
  presentationTitle: string
): Promise<HTMLCanvasElement> {
  // Convert asset URLs to data URLs for html2canvas
  const processedHtml = await convertImagesToDataUrls(slideHtml);
  
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
  
  // Slide footer for professional look
  const footerHtml = `
    <div style="
      position: absolute; 
      bottom: 20px; 
      left: 80px; 
      right: 80px; 
      display: flex; 
      justify-content: space-between; 
      font-family: Inter, system-ui, sans-serif;
      font-size: 14px; 
      color: #94a3b8;
      z-index: 10;
    ">
      <span>${presentationTitle}</span>
      <span>${slideIndex + 1} / ${totalSlides}</span>
    </div>
  `;
  
  // Create wrapper with slide-content class - let CSS handle styling
  const wrapper = document.createElement('div');
  wrapper.className = 'slide-content';
  wrapper.innerHTML = processedHtml + footerHtml;
  wrapper.style.cssText = `
    width: ${SLIDE_WIDTH}px;
    height: ${SLIDE_HEIGHT}px;
    position: relative;
    overflow: hidden;
    box-sizing: border-box;
  `;
  
  // Scale images appropriately
  const images = wrapper.querySelectorAll('img');
  images.forEach(img => {
    img.style.maxWidth = '100%';
    img.style.maxHeight = '400px';
    img.style.objectFit = 'contain';
  });
  
  container.appendChild(wrapper);
  document.body.appendChild(container);
  
  try {
    const canvas = await html2canvas(wrapper, {
      width: SLIDE_WIDTH,
      height: SLIDE_HEIGHT,
      scale: 1, // 2x scale for crisp text on HD screens
      backgroundColor: null, // Let CSS background color shine through
      logging: false,
      useCORS: true,
      allowTaint: true,
      onclone: (clonedDoc) => {
        // Force layout recalculation in cloned document
        const clonedWrapper = clonedDoc.querySelector('.slide-content') as HTMLElement;
        if (clonedWrapper) {
          clonedWrapper.style.transform = 'none';
        }
      }
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
    const canvas = await renderSlideToCanvas(slides[i].html, i, slides.length, title);
    // Use JPEG with 0.85 quality for good balance of size and quality
    const imgData = canvas.toDataURL('image/jpeg', 0.85);
    
    if (i > 0) {
      pdf.addPage([SLIDE_WIDTH, SLIDE_HEIGHT], 'landscape');
    }
    
    pdf.addImage(imgData, 'JPEG', 0, 0, SLIDE_WIDTH, SLIDE_HEIGHT);
  }
  
  // Convert to bytes and save
  const pdfBytes = pdf.output('arraybuffer');
  await writeFile(filePath, new Uint8Array(pdfBytes));
  
  return true;
}
