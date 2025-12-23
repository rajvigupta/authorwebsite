import { useEffect } from 'react';

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
  userEmail?: string; // Optional, not used anymore but kept for compatibility
};

function parseMarkdown(text: string) {
  // Split by markdown patterns while preserving them
  const parts: { text: string; bold?: boolean; italic?: boolean }[] = [];
  
  // Pattern: ***text*** (bold + italic), **text** (bold), *text* (italic)
  const regex = /(\*\*\*.*?\*\*\*|\*\*.*?\*\*|\*.*?\*)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      parts.push({ text: text.slice(lastIndex, match.index) });
    }

    const matched = match[0];
    
    // Determine formatting
    if (matched.startsWith('***') && matched.endsWith('***')) {
      // Bold + Italic
      parts.push({ 
        text: matched.slice(3, -3), 
        bold: true, 
        italic: true 
      });
    } else if (matched.startsWith('**') && matched.endsWith('**')) {
      // Bold
      parts.push({ 
        text: matched.slice(2, -2), 
        bold: true 
      });
    } else if (matched.startsWith('*') && matched.endsWith('*')) {
      // Italic
      parts.push({ 
        text: matched.slice(1, -1), 
        italic: true 
      });
    }

    lastIndex = regex.lastIndex;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push({ text: text.slice(lastIndex) });
  }

  return parts;
}


export function RichTextViewer({ content }: RichTextViewerProps) {
  useEffect(() => {
    // Disable right-click
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    // Disable keyboard shortcuts for copying
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
      // Disable F12, Ctrl+Shift+I, Ctrl+Shift+J
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
  }, []);

  if (!content || content.length === 0) {
    return (
      <div className="text-center py-12 text-text-muted font-lora">
        No content available
      </div>
    );
  }

  return (
    <div 
      className="relative select-none"
      onCopy={(e) => e.preventDefault()}
      onCut={(e) => e.preventDefault()}
      onPaste={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
    >
      {/* Subtle watermark - only once at bottom */}
      <div className="absolute top-0 right-0 text-[8px] text-text-muted/10 pointer-events-none select-none font-mono px-2 py-1">
        Protected Content
      </div>

      <div className="prose prose-lg dark:prose-invert max-w-none prose-headings:text-primary prose-p:text-text-light prose-strong:text-primary">
        {content.map((block) => {
          switch (block.type) {
            case 'heading':
              const HeadingTag = `h${block.level || 2}` as keyof JSX.IntrinsicElements;
              const headingParts = parseMarkdown(block.content);
              return (
                <HeadingTag
                  key={block.id}
                  className="font-cinzel font-bold text-primary mb-4 select-none"
                >
                  {headingParts.map((part, i) => {
                    if (part.bold && part.italic) {
                      return <strong key={i} className="italic">{part.text}</strong>;
                    } else if (part.bold) {
                      return <strong key={i}>{part.text}</strong>;
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
                  className="text-text-light mb-4 whitespace-pre-wrap leading-relaxed select-none font-cormorant text-lg"
                >
                  {parts.map((part, i) => {
                    if (part.bold && part.italic) {
                      return <strong key={i} className="italic font-bold">{part.text}</strong>;
                    } else if (part.bold) {
                      return <strong key={i} className="font-bold">{part.text}</strong>;
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
                  {/* Subtle image watermark */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-white/5 text-xs font-mono rotate-[-15deg] bg-black/5 px-4 py-2 rounded">
                      ©
                    </div>
                  </div>
                  <img
                    src={block.imageUrl}
                    alt={block.alt || 'Chapter image'}
                    className="rounded-lg w-full select-none pointer-events-none border border-accent-maroon/20"
                    draggable="false"
                    onContextMenu={(e) => e.preventDefault()}
                  />
                  {block.alt && (
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

      {/* Subtle footer watermark */}
      <div className="mt-12 pt-6 border-t border-accent-maroon/10 text-center">
        <p className="text-[9px] text-text-muted/30 font-mono select-none">
          This content is protected • Not for redistribution
        </p>
      </div>
    </div>
  );
}