import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Palette } from 'lucide-react';
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

type ReadingTheme = 'gothic' | 'light' | 'dark';

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
  const [theme, setTheme] = useState<ReadingTheme>('gothic');
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const savedTheme = localStorage.getItem('reading-theme') as ReadingTheme;
    if (savedTheme && (savedTheme === 'gothic' || savedTheme === 'light' || savedTheme === 'dark')) {
      setTheme(savedTheme);
    }
  }, []);

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

  const handleThemeChange = (newTheme: ReadingTheme) => {
    setTheme(newTheme);
    localStorage.setItem('reading-theme', newTheme);
    setShowThemeSelector(false);
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
          <p className="text-text-light mb-4 font-lora">Chapter not found</p>
          <button onClick={onClose} className="btn-gold px-6 py-2 rounded-lg">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const getThemeClass = () => {
    if (theme === 'light') return 'reading-theme-light';
    if (theme === 'dark') return 'reading-theme-dark';
    return '';
  };

  const getThemeDetails = (themeType: ReadingTheme) => {
    switch(themeType) {
      case 'gothic':
        return { icon: '🌲', label: 'Gothic Green', desc: 'Mystical' };
      case 'light':
        return { icon: '📖', label: 'Classic White', desc: 'Traditional' };
      case 'dark':
        return { icon: '🌙', label: 'Dark Mode', desc: 'Night Reading' };
    }
  };

  const currentTheme = getThemeDetails(theme);

  return (
    <div className={`fixed inset-0 bg-gothic-darkest z-50 overflow-y-auto ${getThemeClass()}`}>
      {/* Header - Fixed at top */}
      <div className="sticky top-0 z-[100] bg-gothic-dark/95 backdrop-blur-sm border-b border-accent-maroon/30">
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

            {/* Right: Theme toggle only (removed PDF download) */}
            <div className="flex items-center gap-2">
              <div className="relative z-[101]">
                <button
                  onClick={() => setShowThemeSelector(!showThemeSelector)}
                  className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-all border border-primary/30"
                  title="Change reading theme"
                >
                  <Palette size={18} />
                  <span className="text-2xl">{currentTheme.icon}</span>
                  <span className="hidden sm:inline font-lora text-sm">{currentTheme.label}</span>
                </button>

                {showThemeSelector && (
                  <>
                    <div 
                      className="fixed inset-0 z-[102]"
                      onClick={() => setShowThemeSelector(false)}
                    />
                    
                    <div 
                      className="absolute right-0 mt-2 bg-gothic-mid rounded-lg shadow-2xl border-2 border-accent-maroon/30 overflow-hidden min-w-[280px] z-[103]"
                    >
                      <div className="p-2">
                        <p className="text-xs font-cinzel text-primary px-3 py-2 uppercase tracking-wider">
                          Reading Themes
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleThemeChange('gothic');
                        }}
                        className={`w-full px-4 py-4 text-left flex items-center gap-3 hover:bg-gothic-dark transition-colors ${
                          theme === 'gothic' ? 'bg-primary/10 border-l-4 border-primary' : ''
                        }`}
                      >
                        <span className="text-3xl">🌲</span>
                        <div className="flex-1">
                          <div className={`font-lora font-semibold ${theme === 'gothic' ? 'text-primary' : 'text-text-light'}`}>
                            Gothic Green
                          </div>
                          <div className="text-xs text-text-muted font-cormorant italic">
                            Mystical forest aesthetic
                          </div>
                        </div>
                        {theme === 'gothic' && (
                          <div className="text-xs text-primary font-cinzel">✓ Active</div>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleThemeChange('light');
                        }}
                        className={`w-full px-4 py-4 text-left flex items-center gap-3 hover:bg-gothic-dark transition-colors ${
                          theme === 'light' ? 'bg-primary/10 border-l-4 border-primary' : ''
                        }`}
                      >
                        <span className="text-3xl">📖</span>
                        <div className="flex-1">
                          <div className={`font-lora font-semibold ${theme === 'light' ? 'text-primary' : 'text-text-light'}`}>
                            Classic White
                          </div>
                          <div className="text-xs text-text-muted font-cormorant italic">
                            Traditional book experience
                          </div>
                        </div>
                        {theme === 'light' && (
                          <div className="text-xs text-primary font-cinzel">✓ Active</div>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleThemeChange('dark');
                        }}
                        className={`w-full px-4 py-4 text-left flex items-center gap-3 hover:bg-gothic-dark transition-colors ${
                          theme === 'dark' ? 'bg-primary/10 border-l-4 border-primary' : ''
                        }`}
                      >
                        <span className="text-3xl">🌙</span>
                        <div className="flex-1">
                          <div className={`font-lora font-semibold ${theme === 'dark' ? 'text-primary' : 'text-text-light'}`}>
                            Dark Mode
                          </div>
                          <div className="text-xs text-text-muted font-cormorant italic">
                            Easy on the eyes at night
                          </div>
                        </div>
                        {theme === 'dark' && (
                          <div className="text-xs text-primary font-cinzel">✓ Active</div>
                        )}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <p className="text-text-muted font-cormorant italic text-lg">
            {chapter.description}
          </p>
        </div>

        {/* Chapter Content */}
        <div className="bg-gothic-mid rounded-lg border border-accent-maroon/20 p-8 mb-8 shadow-gothic">
          {chapter.content_type === 'pdf' && chapter.pdf_url ? (
            <div className="relative">
              {/* Email watermark for PDF */}
              {user?.email && (
                <div 
                  className="absolute inset-0 pointer-events-none select-none overflow-hidden z-10" 
                  style={{ mixBlendMode: 'multiply' }}
                >
                  <div className="absolute inset-0 grid grid-cols-2 gap-y-32 -rotate-45 scale-150">
                    {[...Array(20)].map((_, i) => (
                      <div
                        key={i}
                        className="text-white/[0.15] font-mono text-sm whitespace-nowrap px-8"
                        style={{
                          transform: `translateY(${(i % 2) * 100}px)`,
                        }}
                      >
                        {user.email}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* PDF Embed - NO DOWNLOAD */}
              <iframe
                src={`${chapter.pdf_url}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`}
                className="w-full border-0 rounded"
                style={{ height: '80vh' }}
                title={chapter.title}
                onContextMenu={(e) => e.preventDefault()}
              />

              {/* Protection message - NO DOWNLOAD BUTTON */}
              <div className="mt-4 p-4 bg-accent-maroon/10 border border-accent-maroon/30 rounded-lg text-center">
                <p className="text-text-muted font-lora text-sm flex items-center justify-center gap-2 flex-wrap">
                  <span>🔒 This PDF is protected</span>
                  {user?.email && (
                    <>
                      <span>•</span>
                      <span className="italic">{user.email}</span>
                    </>
                  )}
                  <span>•</span>
                  <span>View-only • No downloads allowed</span>
                </p>
              </div>
            </div>
          ) : chapter.content_type === 'text' && chapter.rich_content ? (
            <RichTextViewer 
              content={chapter.rich_content as any}
              userEmail={user?.email}
              theme={theme}
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

        <div className="ornamental-divider my-12"></div>

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