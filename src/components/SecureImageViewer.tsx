import { useEffect, useState } from 'react';
import { AlertTriangle, ChevronDown } from 'lucide-react';
import { useScreenshotPrevention } from '../hooks/useScreenshotPrevention';

type PageImage = {
  type: 'page-image';
  url: string;
  pageNumber: number;
};

type SecureImageViewerProps = {
  pages: PageImage[];
  userEmail: string;
  chapterTitle: string;
};

export function SecureImageViewer({
  pages,
  userEmail,
  chapterTitle,
}: SecureImageViewerProps) {
  const [showWarning, setShowWarning] = useState(false);
  const [loadedImages, setLoadedImages] = useState<number>(0);

  // Apply screenshot prevention
  useScreenshotPrevention({
    userEmail,
    contentType: 'pdf',
    onAttempt: () => {
      setShowWarning(true);
      setTimeout(() => setShowWarning(false), 2000);
    },
  });

  // Track loaded images
  const handleImageLoad = () => {
    setLoadedImages(prev => prev + 1);
  };

  return (
    <div className="relative protected-content">
      {/* Warning Overlay */}
      {showWarning && (
        <div className="screenshot-warning-overlay">
          <div className="screenshot-warning-content">
            <div className="text-6xl mb-4">⚠️</div>
            <h3 className="text-2xl font-bold mb-2">Protected Content</h3>
            <p className="mb-2">This action is not allowed</p>
            <p className="text-sm opacity-70">Unauthorized distribution is prohibited</p>
            <p className="text-xs mt-4 opacity-50">Logged: {userEmail}</p>
          </div>
        </div>
      )}

      {/* Loading indicator */}
      {loadedImages < pages.length && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm text-blue-800 dark:text-blue-200">
              Loading pages... {loadedImages}/{pages.length}
            </span>
          </div>
        </div>
      )}

      {/* ✅ REDUCED: CSS watermark overlays - Only 5 rows × 3 watermarks = 15 total */}
      <div className="absolute inset-0 pointer-events-none z-10 select-none overflow-hidden">
        {/* Diagonal watermarks */}
        {[...Array(6)].map((_, i) => (
          <div
            key={`overlay-${i}`}
            className="absolute whitespace-nowrap font-mono"
            style={{
              top: `${i * 20}%`,
              left: '-10%',
              right: '-10%',
              transform: 'rotate(-45deg)',
              color: 'rgba(255, 0, 0, 0.05)', // Slightly increased opacity
              fontSize: '14px',
              fontWeight: 600,
              letterSpacing: '2px',
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          >
            {[...Array(6)].map((_, j) => (
              <span key={j} className="inline-block mx-20">
                {userEmail} • PROTECTED
              </span>
            ))}
          </div>
        ))}
      </div>

      {/* Page images - continuous scroll - ✅ FIXED FOR MOBILE */}
      <div className="space-y-0 relative z-0">
        {pages.map((page) => (
          <div 
            key={page.pageNumber} 
            className="relative bg-white overflow-hidden"
            onContextMenu={(e) => {
              e.preventDefault();
              setShowWarning(true);
              setTimeout(() => setShowWarning(false), 2000);
              return false;
            }}
          >
        
            <img
              src={page.url}
              alt={`Page ${page.pageNumber}`}
              className="w-full h-auto select-none"
              draggable="false"
              onLoad={handleImageLoad}
              onContextMenu={(e) => e.preventDefault()}
              onDragStart={(e) => e.preventDefault()}
              style={{
                userSelect: 'none',
                WebkitUserSelect: 'none',
                pointerEvents: 'auto',
                touchAction: 'pinch-zoom',
                display: 'block',
                maxWidth: '100%',
                objectFit: 'contain',
              }}
            />
            
            
            {/* Page separator */}
            {page.pageNumber < pages.length && (
              <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
            )}
          </div>
        ))}
      </div>

      {/* Scroll indicator - Hide on mobile, show on desktop */}
      {pages.length > 1 && (
        <div className="hidden md:flex fixed bottom-8 right-8 bg-accent-maroon/80 text-white px-4 py-2 rounded-full shadow-lg items-center gap-2 z-20 animate-bounce">
          <ChevronDown size={20} />
          <span className="text-sm font-lora">Scroll for more pages</span>
        </div>
      )}

      {/* Protection notice */}
      <div className="mt-6 p-4 bg-accent-maroon/10 border border-accent-maroon/30 rounded-lg">
        <div className="flex items-start gap-2">
          <AlertTriangle size={16} className="text-accent-maroon-light flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">
            <p className="text-text-muted font-lora">
              🔒 This content contains embedded watermarks: 
              <span className="text-accent-maroon-light font-semibold ml-1">{userEmail}</span>
            </p>
            <p className="text-text-dim text-xs mt-1">
              All {pages.length} pages are watermarked and protected. Unauthorized distribution is prohibited and traceable.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}