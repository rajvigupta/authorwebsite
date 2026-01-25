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
      
      {/* Header - Fixed at top - MOBILE RESPONSIVE */}
      <div className="sticky top-0 z-[100] bg-gothic-dark/95 backdrop-blur-sm border-b border-accent-maroon/30">
        <div className="max-w-4xl mx-auto px-3 md:px-4 py-3 md:py-4">
          <div className="flex items-center justify-between gap-2">
            {/* Left: Close button - Compact on mobile */}
            <button
              onClick={onClose}
              className="flex items-center gap-1 md:gap-2 text-text-muted hover:text-primary transition-colors shrink-0"
            >
              <X size={20} className="md:w-6 md:h-6" />
              <span className="font-lora text-sm md:text-base hidden sm:inline">Close</span>
            </button>

            {/* Center: Chapter info - Truncate on mobile */}
            <div className="text-center flex-1 px-2 md:px-4 min-w-0 overflow-hidden">
              {bookTitle && (
                <p className="text-xs text-text-muted font-lora truncate">{bookTitle}</p>
              )}
              <h1 className="text-sm md:text-lg font-cinzel text-primary truncate">
                Ch {chapter.chapter_number}: {chapter.title}
              </h1>
            </div>

            {/* Right: Theme toggle - Icon only on mobile */}
            <div className="flex items-center gap-1 md:gap-2 shrink-0">
              <div className="relative z-[101]">
                <button
                  onClick={() => setShowThemeSelector(!showThemeSelector)}
                  className="flex items-center gap-1 md:gap-2 px-2 md:px-4 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-all border border-primary/30"
                  title="Change reading theme"
                >
                  <Palette size={16} className="md:w-5 md:h-5" />
                  <span className="text-xl md:text-2xl">{currentTheme.icon}</span>
                  <span className="hidden lg:inline font-lora text-sm">{currentTheme.label}</span>
                </button>

                {showThemeSelector && (
                  <>
                    <div 
                      className="fixed inset-0 z-[102]"
                      onClick={() => setShowThemeSelector(false)}
                    />
                    
                    {/* Theme Dropdown - Mobile optimized */}
                    <div 
                      className="absolute right-0 mt-2 bg-gothic-mid rounded-lg shadow-2xl border-2 border-accent-maroon/30 overflow-hidden w-[260px] md:min-w-[280px] z-[103]"
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
                        className={`w-full px-3 md:px-4 py-3 md:py-4 text-left flex items-center gap-2 md:gap-3 hover:bg-gothic-dark transition-colors ${
                          theme === 'gothic' ? 'bg-primary/10 border-l-4 border-primary' : ''
                        }`}
                      >
                        <span className="text-2xl md:text-3xl">🌲</span>
                        <div className="flex-1 min-w-0">
                          <div className={`font-lora font-semibold text-sm md:text-base ${theme === 'gothic' ? 'text-primary' : 'text-text-light'}`}>
                            Gothic Green
                          </div>
                          <div className="text-xs text-text-muted font-cormorant italic truncate">
                            Mystical forest
                          </div>
                        </div>
                        {theme === 'gothic' && (
                          <div className="text-xs text-primary font-cinzel shrink-0">✓</div>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleThemeChange('light');
                        }}
                        className={`w-full px-3 md:px-4 py-3 md:py-4 text-left flex items-center gap-2 md:gap-3 hover:bg-gothic-dark transition-colors ${
                          theme === 'light' ? 'bg-primary/10 border-l-4 border-primary' : ''
                        }`}
                      >
                        <span className="text-2xl md:text-3xl">📖</span>
                        <div className="flex-1 min-w-0">
                          <div className={`font-lora font-semibold text-sm md:text-base ${theme === 'light' ? 'text-primary' : 'text-text-light'}`}>
                            Classic White
                          </div>
                          <div className="text-xs text-text-muted font-cormorant italic truncate">
                            Traditional book
                          </div>
                        </div>
                        {theme === 'light' && (
                          <div className="text-xs text-primary font-cinzel shrink-0">✓</div>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleThemeChange('dark');
                        }}
                        className={`w-full px-3 md:px-4 py-3 md:py-4 text-left flex items-center gap-2 md:gap-3 hover:bg-gothic-dark transition-colors ${
                          theme === 'dark' ? 'bg-primary/10 border-l-4 border-primary' : ''
                        }`}
                      >
                        <span className="text-2xl md:text-3xl">🌙</span>
                        <div className="flex-1 min-w-0">
                          <div className={`font-lora font-semibold text-sm md:text-base ${theme === 'dark' ? 'text-primary' : 'text-text-light'}`}>
                            Dark Mode
                          </div>
                          <div className="text-xs text-text-muted font-cormorant italic truncate">
                            Night reading
                          </div>
                        </div>
                        {theme === 'dark' && (
                          <div className="text-xs text-primary font-cinzel shrink-0">✓</div>
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

      {/* Main Content - Mobile optimized padding */}
      <div className="max-w-4xl mx-auto px-3 md:px-4 py-6 md:py-8">
        <div className="mb-6 md:mb-8 text-center">
          <p className="text-text-muted font-cormorant italic text-base md:text-lg">
            {chapter.description}
          </p>
        </div>

        {/* Chapter Content - Mobile optimized */}
        <div className="bg-gothic-mid rounded-lg border border-accent-maroon/20 p-4 md:p-8 mb-6 md:mb-8 shadow-gothic">
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
                        className="text-white/[0.15] font-mono text-xs md:text-sm whitespace-nowrap px-8"
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

              {/* PDF Embed - Responsive height */}
              <iframe
                src={`${chapter.pdf_url}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`}
                className="w-full border-0 rounded"
                style={{ height: '60vh' }} // Reduced from 80vh for mobile
                title={chapter.title}
                onContextMenu={(e) => e.preventDefault()}
              />

              {/* Protection message */}
              <div className="mt-4 p-3 md:p-4 bg-accent-maroon/10 border border-accent-maroon/30 rounded-lg text-center">
                <p className="text-text-muted font-lora text-xs md:text-sm flex flex-wrap items-center justify-center gap-1 md:gap-2">
                  <span>🔒 Protected</span>
                  {user?.email && (
                    <>
                      <span className="hidden sm:inline">•</span>
                      <span className="italic text-xs hidden sm:inline">{user.email}</span>
                    </>
                  )}
                  <span className="hidden sm:inline">•</span>
                  <span>View-only</span>
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

        {/* Navigation - Mobile optimized */}
        {(hasPrevChapter || hasNextChapter) && (
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 mb-8 md:mb-12">
            <button
              onClick={onPrevChapter}
              disabled={!hasPrevChapter}
              className="flex items-center justify-center gap-2 px-4 md:px-6 py-3 bg-gothic-mid text-primary rounded-lg hover:bg-primary/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed font-cinzel text-sm md:text-base"
            >
              <ChevronLeft size={18} className="md:w-5 md:h-5" />
              <span className="hidden sm:inline">Previous Chapter</span>
              <span className="sm:hidden">Previous</span>
            </button>

            <button
              onClick={onNextChapter}
              disabled={!hasNextChapter}
              className="flex items-center justify-center gap-2 px-4 md:px-6 py-3 bg-gothic-mid text-primary rounded-lg hover:bg-primary/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed font-cinzel text-sm md:text-base"
            >
              <span className="hidden sm:inline">Next Chapter</span>
              <span className="sm:hidden">Next</span>
              <ChevronRight size={18} className="md:w-5 md:h-5" />
            </button>
          </div>
        )}

        <div className="ornamental-divider my-8 md:my-12"></div>

        <div className="mb-8 md:mb-12">
          <h2 className="text-xl md:text-2xl font-cinzel text-primary mb-4 md:mb-6 text-center">
            Chapter Discussion
          </h2>
          <CommentVoteSection 
            chapterId={chapter.id}
            isPurchased={true}
          />
        </div>
      </div>

      {/* Footer - Mobile optimized */}
      <div className="border-t border-accent-maroon/30 py-6 md:py-8">
        <div className="max-w-4xl mx-auto px-3 md:px-4 text-center">
          <button
            onClick={onClose}
            className="btn-gold px-6 md:px-8 py-2 md:py-3 rounded-lg font-cinzel text-sm md:text-base w-full sm:w-auto"
          >
            Back to {bookTitle || 'Chapters'}
          </button>
        </div>
      </div>
    </div>
  );
}