import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { RichTextViewer } from './RichTextViewer';
import { CommentVoteSection } from './CommentVoteSection';
import type { Chapter } from '../lib/supabase';

type ChapterReaderProps = {
  chapterId: string;
  bookTitle?: string;
  onClose: () => void;
  onPrevChapter?: () => void;
  onNextChapter?: () => void;
  hasPrevChapter?: boolean;
  hasNextChapter?: boolean;
};

export function ChapterReader({
  chapterId,
  bookTitle,
  onClose,
  onPrevChapter,
  onNextChapter,
  hasPrevChapter,
  hasNextChapter,
}: ChapterReaderProps) {
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    loadChapter();
  }, [chapterId]);

  const loadChapter = async () => {
    try {
      const { data, error } = await supabase
        .from('chapters')
        .select('*')
        .eq('id', chapterId)
        .single();

      if (error) throw error;
      setChapter(data);
    } catch (error) {
      console.error('Error loading chapter:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    if (chapter?.pdf_url) {
      window.open(chapter.pdf_url, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gothic-darkest flex items-center justify-center z-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!chapter) {
    return (
      <div className="fixed inset-0 bg-gothic-darkest flex items-center justify-center z-50">
        <div className="text-center">
          <p className="text-text-light mb-4">Chapter not found</p>
          <button onClick={onClose} className="btn-gold px-6 py-2 rounded-lg">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gothic-darkest z-50 overflow-y-auto">
      {/* Header - Fixed at top */}
      <div className="sticky top-0 z-10 bg-gothic-dark/95 backdrop-blur-sm border-b border-accent-maroon/30">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Left: Close button */}
            <button
              onClick={onClose}
              className="flex items-center gap-2 text-text-muted hover:text-primary transition-colors"
            >
              <X size={24} />
              <span className="font-lora">Close</span>
            </button>

            {/* Center: Chapter info */}
            <div className="text-center flex-1 px-4">
              {bookTitle && (
                <p className="text-xs text-text-muted font-lora">{bookTitle}</p>
              )}
              <h1 className="text-lg font-cinzel text-primary">
                Chapter {chapter.chapter_number}: {chapter.title}
              </h1>
            </div>

            {/* Right: PDF download if applicable */}
            {chapter.content_type === 'pdf' && chapter.pdf_url && (
              <button
                onClick={handleDownloadPDF}
                className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
              >
                <Download size={18} />
                <span className="font-lora text-sm">PDF</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content - Centered, max-width for readability */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Chapter Description */}
        <div className="mb-8 text-center">
          <p className="text-text-muted font-cormorant italic text-lg">
            {chapter.description}
          </p>
        </div>

        {/* Chapter Content */}
        <div className="bg-gothic-mid rounded-lg border border-accent-maroon/20 p-8 mb-8 shadow-gothic">
          {chapter.content_type === 'pdf' && chapter.pdf_url ? (
            <div className="text-center py-12">
              <p className="text-text-light mb-4 font-lora">
                This chapter is available as a PDF download.
              </p>
              <button
                onClick={handleDownloadPDF}
                className="btn-gold px-6 py-3 rounded-lg font-cinzel inline-flex items-center gap-2"
              >
                <Download size={20} />
                Download Chapter PDF
              </button>
            </div>
          ) : chapter.content_type === 'text' && chapter.rich_content ? (
            <RichTextViewer 
              content={chapter.rich_content as any}
            />
          ) : (
            <div className="text-center py-12 text-text-muted font-lora">
              No content available
            </div>
          )}
        </div>

        {/* Navigation - Prev/Next Chapter */}
        {(hasPrevChapter || hasNextChapter) && (
          <div className="flex justify-between items-center mb-12">
            <button
              onClick={onPrevChapter}
              disabled={!hasPrevChapter}
              className="flex items-center gap-2 px-6 py-3 bg-gothic-mid text-primary rounded-lg hover:bg-primary/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed font-cinzel"
            >
              <ChevronLeft size={20} />
              Previous Chapter
            </button>

            <button
              onClick={onNextChapter}
              disabled={!hasNextChapter}
              className="flex items-center gap-2 px-6 py-3 bg-gothic-mid text-primary rounded-lg hover:bg-primary/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed font-cinzel"
            >
              Next Chapter
              <ChevronRight size={20} />
            </button>
          </div>
        )}

        {/* Ornamental Divider */}
        <div className="ornamental-divider my-12"></div>

        {/* Chapter Comments - Only visible when scrolled down */}
        <div className="mb-12">
          <h2 className="text-2xl font-cinzel text-primary mb-6 text-center">
            Chapter Discussion
          </h2>
          <CommentVoteSection 
            chapterId={chapter.id}
            isPurchased={true}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-accent-maroon/30 py-8">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <button
            onClick={onClose}
            className="btn-gold px-8 py-3 rounded-lg font-cinzel"
          >
            Back to {bookTitle || 'Chapters'}
          </button>
        </div>
      </div>
    </div>
  );
}