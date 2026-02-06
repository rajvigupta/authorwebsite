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

    // ✅ FIXED: Add minimal watermarks (reduced from heavy overlay)
    addMinimalWatermarks(context, canvas.width, canvas.height, watermarkText, pageNum);

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

// ✅ NEW: Minimal watermark function - only essential watermarks
function addMinimalWatermarks(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  text: string,
  pageNum: number
) {
  ctx.save();

  // Subtle style
  ctx.font = '18px Arial';
  ctx.fillStyle = 'rgba(128,128,128,0.09)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const angle = -45 * Math.PI / 180;

  const gapX = width / 4;
  const gapY = height / 4;

  // 🔁 Grid pattern
  for (let x = gapX / 2; x < width; x += gapX) {
    for (let y = gapY / 2; y < height; y += gapY) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.fillText(text, 0, 0);
      ctx.restore();
    }
  }

  // Footer (slightly stronger)
  ctx.fillStyle = 'rgba(128,128,128,0.15)';
  ctx.font = '12px Arial';
  ctx.textAlign = 'right';

  ctx.fillText(
    `Page ${pageNum} • ${text}`,
    width - 15,
    height - 15
  );

  ctx.restore();
}
