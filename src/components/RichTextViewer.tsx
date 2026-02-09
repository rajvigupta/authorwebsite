import { useEffect, useState } from 'react';
import { Type, ZoomIn, ZoomOut, AlignLeft } from 'lucide-react';
import { useScreenshotPrevention } from '../hooks/useScreenshotPrevention';



type ContentBlock = {
  id: string;
  type: 'heading' | 'paragraph' | 'image';
  content: string;
  level?: number;
  imageUrl?: string;
  alt?: string;
};

type RichTextViewerProps = {
  content: ContentBlock[];
  userEmail?: string;
  theme?: 'gothic' | 'light' | 'dark';
};

type FontSize = 'small' | 'medium' | 'large';
type LineHeight = 'normal' | 'spacious';

function parseMarkdown(text: string) {
  const parts: { text: string; bold?: boolean; italic?: boolean }[] = [];
  const regex = /(\*\*\*.*?\*\*\*|\*\*.*?\*\*|\*.*?\*)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ text: text.slice(lastIndex, match.index) });
    }

    const matched = match[0];
    
    if (matched.startsWith('***') && matched.endsWith('***')) {
      parts.push({ 
        text: matched.slice(3, -3), 
        bold: true, 
        italic: true 
      });
    } else if (matched.startsWith('**') && matched.endsWith('**')) {
      parts.push({ 
        text: matched.slice(2, -2), 
        bold: true 
      });
    } else if (matched.startsWith('*') && matched.endsWith('*')) {
      parts.push({ 
        text: matched.slice(1, -1), 
        italic: true 
      });
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push({ text: text.slice(lastIndex) });
  }

  return parts;
}

export function RichTextViewer({ content, userEmail, theme = 'gothic' }: RichTextViewerProps) {
  const [fontSize, setFontSize] = useState<FontSize>('medium');
  const [lineHeight, setLineHeight] = useState<LineHeight>('normal');
  const [showControls, setShowControls] = useState(false);

  // Load preferences from localStorage
  useEffect(() => {
    const savedFontSize = localStorage.getItem('reader-font-size') as FontSize;
    const savedLineHeight = localStorage.getItem('reader-line-height') as LineHeight;
    
    if (savedFontSize) setFontSize(savedFontSize);
    if (savedLineHeight) setLineHeight(savedLineHeight);
  }, []);

  useScreenshotPrevention({
    userEmail,
    contentType: 'text',
  });

  // Save preferences
  const handleFontSizeChange = (size: FontSize) => {
    setFontSize(size);
    localStorage.setItem('reader-font-size', size);
  };

  const handleLineHeightChange = (height: LineHeight) => {
    setLineHeight(height);
    localStorage.setItem('reader-line-height', height);
  };

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === 'c' || e.key === 'C' || 
         e.key === 's' || e.key === 'S' ||
         e.key === 'p' || e.key === 'P' ||
         e.key === 'a' || e.key === 'A')
      ) {
        e.preventDefault();
        return false;
      }
      if (
        e.key === 'F12' ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && 
         (e.key === 'I' || e.key === 'J' || e.key === 'C'))
      ) {
        e.preventDefault();
        return false;
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);//

  if (!content || content.length === 0) {
    return (
      <div className="text-center py-12 text-text-muted font-lora">
        No content available
      </div>
    );
  }

  // Get theme wrapper class
  const getThemeWrapperClass = () => {
    if (theme === 'light') return 'reading-theme-light';
    if (theme === 'dark') return 'reading-theme-dark';
    return ''; // Gothic is default
  };

  // Get watermark style based on theme - IMPROVED VISIBILITY
  const getWatermarkStyle = () => {
    switch(theme) {
      case 'gothic':
        return {
          color: 'rgba(212, 175, 55, 0.15)', // Increased from 0.08
          textShadow: '0 0 4px rgba(212, 175, 55, 0.3)',
          fontSize: '11px',
          fontWeight: '500'
        };
      case 'light':
        return {
          color: 'rgba(0, 0, 0, 0.08)', // Reduced from 0.05 but still subtle
          textShadow: '0 0 2px rgba(0, 0, 0, 0.1)',
          fontSize: '10px',
          fontWeight: '400'
        };
      case 'dark':
        return {
          color: 'rgba(255, 255, 255, 0.12)', // Increased from 0.10
          textShadow: '0 0 4px rgba(255, 255, 255, 0.2)',
          fontSize: '11px',
          fontWeight: '500'
        };
      default:
        return {};
    }
  };

  // Font size classes - MOBILE RESPONSIVE
const getFontSizeClass = () => {
  switch(fontSize) {
    case 'small': return 'text-sm md:text-base';
    case 'medium': return 'text-base md:text-lg';
    case 'large': return 'text-lg md:text-xl';
  }
};
  // Line height classes - FIXED: More distinction
  const getLineHeightClass = () => {
    switch(lineHeight) {
      case 'normal': return 'leading-relaxed'; // 1.625
      case 'spacious': return 'leading-loose'; // 2.0
    }
  };

  const watermarkStyle = getWatermarkStyle();

  return (
    <div 
      className={`relative select-none ${getThemeWrapperClass()}`}
      onCopy={(e) => e.preventDefault()}
      onCut={(e) => e.preventDefault()}
      onPaste={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
    >
      {/* Reading Controls - Floating Toolbar */}
      <div className="sticky top-20 z-30 mb-6">
        <div className="flex justify-center">
          <button
  onClick={() => setShowControls(!showControls)}
  className="px-3 md:px-4 py-2 bg-gothic-mid/90 backdrop-blur-sm text-primary border border-primary/30 rounded-lg hover:bg-primary/10 transition-all font-lora text-xs md:text-sm flex items-center gap-1 md:gap-2"
>
  <Type size={14} className="md:w-4 md:h-4" />
  <span className="hidden sm:inline">Reading Options</span>
  <span className="sm:hidden">Options</span>
</button>
          
        </div>

        {showControls && (
        <div className="mt-2 mx-2 md:mx-auto max-w-2xl bg-gothic-mid/95 backdrop-blur-sm border border-primary/30 rounded-lg p-3 md:p-4 shadow-gold">
            {/* Font Size Controls */}
            <div className="mb-4">
              <label className="block text-sm font-cinzel text-primary mb-2">Font Size</label>
              <div className="flex gap-2">
               <button
  onClick={() => handleFontSizeChange('small')}
  className={`flex-1 px-2 md:px-3 py-2 rounded-lg font-lora text-xs md:text-sm transition-all ${
    fontSize === 'small'
      ? 'bg-primary text-gothic-darkest font-semibold'
      : 'bg-gothic-dark text-text-muted hover:bg-primary/20'
  }`}
>
  <ZoomOut size={12} className="inline mr-1 md:w-3.5 md:h-3.5" />
  <span className="hidden sm:inline">Small</span>
  <span className="sm:hidden">S</span>
</button>
<button
  onClick={() => handleFontSizeChange('medium')}
  className={`flex-1 px-2 md:px-3 py-2 rounded-lg font-lora text-xs md:text-sm transition-all ${
    fontSize === 'medium'
      ? 'bg-primary text-gothic-darkest font-semibold'
      : 'bg-gothic-dark text-text-muted hover:bg-primary/20'
  }`}
>
  <Type size={12} className="inline mr-1 md:w-3.5 md:h-3.5" />
  <span className="hidden sm:inline">Medium</span>
  <span className="sm:hidden">M</span>
</button>
<button
  onClick={() => handleFontSizeChange('large')}
  className={`flex-1 px-2 md:px-3 py-2 rounded-lg font-lora text-xs md:text-sm transition-all ${
    fontSize === 'large'
      ? 'bg-primary text-gothic-darkest font-semibold'
      : 'bg-gothic-dark text-text-muted hover:bg-primary/20'
  }`}
>
  <ZoomIn size={12} className="inline mr-1 md:w-3.5 md:h-3.5" />
  <span className="hidden sm:inline">Large</span>
  <span className="sm:hidden">L</span>
</button>
              </div>
            </div>

            {/* Line Height Controls - SIMPLIFIED TO 2 OPTIONS */}
            <div>
              <label className="block text-sm font-cinzel text-primary mb-2">Line Spacing</label>
              <div className="flex gap-2">
               <button
               onClick={() => handleLineHeightChange('normal')}
                className={`flex-1 px-2 md:px-3 py-2 rounded-lg font-lora text-xs md:text-sm transition-all ${
                lineHeight === 'normal'
                     ? 'bg-primary text-gothic-darkest font-semibold'
                     : 'bg-gothic-dark text-text-muted hover:bg-primary/20'
                        }`}
                   >
  <AlignLeft size={12} className="inline mr-1 md:w-3.5 md:h-3.5" />
  Normal
</button>
<button
  onClick={() => handleLineHeightChange('spacious')}
  className={`flex-1 px-2 md:px-3 py-2 rounded-lg font-lora text-xs md:text-sm transition-all ${
    lineHeight === 'spacious'
      ? 'bg-primary text-gothic-darkest font-semibold'
      : 'bg-gothic-dark text-text-muted hover:bg-primary/20'
  }`}
>
  <AlignLeft size={12} className="inline mr-1 md:w-3.5 md:h-3.5" />
  Spacious
</button> 
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SIMPLIFIED WATERMARKS - Just 3 strategic placements */}
      {userEmail && (
        <div className="fixed inset-0 pointer-events-none select-none overflow-hidden z-10">
          {/* Center watermark */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-mono whitespace-nowrap opacity-60"
            style={{
              ...watermarkStyle,
              transform: 'translate(-50%, -50%) rotate(-45deg)'
            }}
          >
            {userEmail}
          </div>

          {/* Top-right watermark */}
          <div
            className="absolute top-1/4 right-1/4 font-mono whitespace-nowrap opacity-50"
            style={{
              ...watermarkStyle,
              transform: 'rotate(-45deg)'
            }}
          >
            {userEmail}
          </div>

          {/* Bottom-left watermark */}
          <div
            className="absolute bottom-1/4 left-1/4 font-mono whitespace-nowrap opacity-50"
            style={{
              ...watermarkStyle,
              transform: 'rotate(-45deg)'
            }}
          >
            {userEmail}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className={`prose prose-lg max-w-none px-3 md:px-0 ${getFontSizeClass()} ${getLineHeightClass()}`}>
        {content.map((block) => {
          switch (block.type) {
            case 'heading':
              const HeadingTag = `h${block.level || 2}` as keyof JSX.IntrinsicElements;
              const headingParts = parseMarkdown(block.content);
              return (

                <HeadingTag
               key={block.id}
               className={`font-cinzel font-bold text-primary mb-3 md:mb-4 select-none ${
               block.level === 1 ? 'text-2xl md:text-3xl lg:text-4xl' :
               block.level === 2 ? 'text-xl md:text-2xl lg:text-3xl' :
               'text-lg md:text-xl lg:text-2xl'
                }`}
               >


                  {headingParts.map((part, i) => {
                    if (part.bold && part.italic) {
                      return <strong key={i} className="italic text-primary">{part.text}</strong>;
                    } else if (part.bold) {
                      return <strong key={i} className="text-primary">{part.text}</strong>;
                    } else if (part.italic) {
                      return <em key={i}>{part.text}</em>;
                    }
                    return <span key={i}>{part.text}</span>;
                  })}
                </HeadingTag>
              );

            case 'paragraph':
              const parts = parseMarkdown(block.content);
              return (
                <p
                  key={block.id}
                  className="text-text-light mb-4 whitespace-pre-wrap select-none font-cormorant"
                >
                  {parts.map((part, i) => {
                    if (part.bold && part.italic) {
                      return (
                        <strong key={i} className="italic font-bold text-primary">
                          {part.text}
                        </strong>
                      );
                    } else if (part.bold) {
                      return (
                        <strong key={i} className="font-bold text-primary">
                          {part.text}
                        </strong>
                      );
                    } else if (part.italic) {
                      return <em key={i} className="italic">{part.text}</em>;
                    }
                    return <span key={i}>{part.text}</span>;
                  })}
                </p>
              );

            case 'image':
              return block.imageUrl ? (
                <figure key={block.id} className="my-6 relative">
                  <img
                    src={block.imageUrl}
                    alt={block.alt || 'Chapter image'}
                    className="rounded-lg w-full select-none pointer-events-none border border-accent-maroon/20"
                    draggable="false"
                    onContextMenu={(e) => e.preventDefault()}
                  />
                  {block.alt && block.alt.trim() && (
                    <figcaption className="text-center text-sm text-text-muted mt-2 select-none font-lora italic">
                      {block.alt}
                    </figcaption>
                  )}
                </figure>
              ) : null;

            default:
              return null;
          }
        })}
      </div>

      {/* Footer watermark - subtle text only */}
      <div className="mt-12 pt-6 border-t border-accent-maroon/10 text-center relative z-20">
        <p className="text-[9px] text-text-muted/30 font-mono select-none">
          Protected Content • Not for redistribution
        </p>
      </div>
    </div>
  );
}