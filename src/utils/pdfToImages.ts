import * as pdfjsLib from 'pdfjs-dist';

// Set worker source
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

export type WatermarkedPage = {
  pageNumber: number;
  imageData: string; // base64
  width: number;
  height: number;
};

export async function convertPdfToWatermarkedImages(
  pdfFile: File,
  watermarkText: string = 'Protected Content'
): Promise<WatermarkedPage[]> {
  // Load PDF
  const arrayBuffer = await pdfFile.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  const pages: WatermarkedPage[] = [];
  const pageCount = pdf.numPages;

  // Convert each page
  for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
    const page = await pdf.getPage(pageNum);
    
    // Get page dimensions
    const viewport = page.getViewport({ scale: 2.0 }); // 2x for quality
    
    // Create canvas
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    // Render PDF page to canvas
    await page.render({
      canvasContext: context,
      viewport: viewport,
    }).promise;

    // Add watermarks
    addWatermarks(context, canvas.width, canvas.height, watermarkText, pageNum);

    // Convert to base64 image
    const imageData = canvas.toDataURL('image/jpeg', 0.85);

    pages.push({
      pageNumber: pageNum,
      imageData,
      width: viewport.width,
      height: viewport.height,
    });
  }

  return pages;
}

function addWatermarks(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  text: string,
  pageNum: number
) {
  // Save state
  ctx.save();

  // Set watermark style
  ctx.font = '24px Arial';
  ctx.fillStyle = 'rgba(128, 128, 128, 0.15)'; // Subtle grey
  ctx.textAlign = 'center';

  // Diagonal watermarks across page
  const spacing = 200;
  for (let y = -height; y < height * 2; y += spacing) {
    for (let x = -width; x < width * 2; x += spacing * 1.5) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(-45 * Math.PI / 180);
      
      // Main watermark
      ctx.fillText(text, 0, 0);
      
      // Date watermark
      ctx.font = '16px Arial';
      ctx.fillText(new Date().toLocaleDateString(), 0, 25);
      
      ctx.restore();
    }
  }

  // Page number watermark (bottom-right corner)
  ctx.fillStyle = 'rgba(128, 128, 128, 0.2)';
  ctx.font = 'bold 18px Arial';
  ctx.textAlign = 'right';
  ctx.fillText(`Page ${pageNum} • ${text}`, width - 20, height - 20);

  // Corner watermarks
  ctx.font = '14px Arial';
  ctx.fillStyle = 'rgba(128, 128, 128, 0.15)';
  
  // Top-left
  ctx.textAlign = 'left';
  ctx.fillText(text, 20, 30);
  
  // Top-right
  ctx.textAlign = 'right';
  ctx.fillText(text, width - 20, 30);
  
  // Bottom-left
  ctx.textAlign = 'left';
  ctx.fillText(`${text} • ${new Date().toLocaleDateString()}`, 20, height - 20);

  // Restore state
  ctx.restore();
}


