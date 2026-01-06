import { useState, useEffect } from 'react';
import { BookOpen, Lock, Book, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { BookView } from './BookViewer';
import { StandaloneChapterView } from './chapterviewe';
import { AuthorProfileSection } from './AuthorProfileSection';
import type { Chapter, Purchase, Book as BookType, Profile } from '../lib/supabase';

type ContentView = 'store' | 'chapter' | 'book';

export function ChapterStore() {
  const [books, setBooks] = useState<BookType[]>([]);
  const [bookChapterCounts, setBookChapterCounts] = useState<Record<string, number>>({});
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [authorProfile, setAuthorProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ContentView>('store');
  const [selectedChapter, setSelectedChapter] = useState<string | null>(null);
  const [selectedBook, setSelectedBook] = useState<string | null>(null);
  const { user, profile } = useAuth();

  useEffect(() => {
    fetchContent();
    fetchAuthorProfile();
    if (user) {
      fetchPurchases();
    }
  }, [user]);

  const fetchAuthorProfile = async () => {
    try {
      const { data: authorData, error: authorError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'author')
        .maybeSingle();

      if (authorError) throw authorError;
      setAuthorProfile(authorData);
    } catch (error) {
      console.error('Error fetching author profile:', error);
    }
  };

  const fetchContent = async () => {
    try {
      const [booksRes, chaptersRes] = await Promise.all([
        supabase.from('books').select('*').eq('is_published', true).order('created_at', { ascending: false }),
        supabase.from('chapters').select('*').eq('is_published', true).is('book_id', null).order('chapter_number')
      ]);

      if (booksRes.error) throw booksRes.error;
      if (chaptersRes.error) throw chaptersRes.error;

      setBooks(booksRes.data || []);
      setChapters(chaptersRes.data || []);

      if (booksRes.data) {
        const counts: Record<string, number> = {};
        for (const book of booksRes.data) {
          const { count } = await supabase
            .from('chapters')
            .select('*', { count: 'exact', head: true })
            .eq('book_id', book.id)
            .eq('is_published', true);
          counts[book.id] = count || 0;
        }
        setBookChapterCounts(counts);
      }
    } catch (error) {
      console.error('Error fetching content:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPurchases = async () => {
    try {
      const { data, error } = await supabase
        .from('purchases')
        .select('*')
        .eq('user_id', user!.id)
        .eq('payment_status', 'completed');

      if (error) throw error;
      setPurchases(data || []);
    } catch (error) {
      console.error('Error fetching purchases:', error);
    }
  };

  const isPurchased = (chapterId: string) => {
    return purchases.some((p) => p.chapter_id === chapterId);
  };

  const handleViewChapter = (chapterId: string) => {
    setSelectedChapter(chapterId);
    setView('chapter');
  };

  const handleViewBook = (bookId: string) => {
    setSelectedBook(bookId);
    setView('book');
  };

  const handleCloseView = () => {
    setView('store');
    setSelectedChapter(null);
    setSelectedBook(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gothic-darkest flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Full page views
  if (view === 'book' && selectedBook) {
    return <BookView bookId={selectedBook} onBack={handleCloseView} />;
  }

  if (view === 'chapter' && selectedChapter) {
    return <StandaloneChapterView chapterId={selectedChapter} onBack={handleCloseView} />;
  }

  // Store page
  return (
    <div className="min-h-screen bg-gothic-gradient">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Author Profile Section */}
        {authorProfile && (
          <div className="mb-12">
            <AuthorProfileSection 
              authorUser={authorProfile}
              canEdit={false}
            />
          </div>
        )}

        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-cinzel font-bold text-primary mb-4 text-gold-glow">
            Stories by Alankrita - @memorycraver
          </h1>
          <p className="text-lg font-cormorant italic text-text-muted">
            Dive into captivating tales written in time
          </p>
        </div>

        {/* Book Series */}
        {books.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <Book size={28} />
              Book Series
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {books.map((book) => {
                const chapterCount = bookChapterCounts[book.id] || 0;
                return (
                  <div
                    key={book.id}
                    onClick={() => handleViewBook(book.id)}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow cursor-pointer transform hover:scale-[1.02] transition-transform"
                  >
                    {book.cover_image_url ? (
                      <img
                        src={book.cover_image_url}
                        alt={book.title}
                        className="w-full h-64 object-cover"
                      />
                    ) : (
                      <div className="w-full h-64 bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
                        <Book size={64} className="text-white" />
                      </div>
                    )}

                    <div className="p-6">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-primary-600 dark:text-primary-400">
                          Book Series
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {chapterCount} chapter{chapterCount !== 1 ? 's' : ''}
                        </span>
                      </div>

                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                        {book.title}
                      </h3>

                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-3">
                        {book.description}
                      </p>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Individual chapter purchases
                        </span>
                        <span className="text-sm font-medium text-primary-600 dark:text-primary-400">
                          View Series →
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Standalone Chapters */}
        {chapters.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <FileText size={28} />
              Standalone Chapters
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {chapters.map((chapter) => {
                const purchased = isPurchased(chapter.id);
                return (
                  <div
                    key={chapter.id}
                    onClick={() => handleViewChapter(chapter.id)}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow cursor-pointer transform hover:scale-[1.02] transition-transform"
                  >
                    {chapter.cover_image_url ? (
                      <img
                        src={chapter.cover_image_url}
                        alt={chapter.title}
                        className="w-full h-64 object-cover"
                      />
                    ) : (
                      <div className="w-full h-64 bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                        <BookOpen size={64} className="text-white" />
                      </div>
                    )}

                    <div className="p-6">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Chapter {chapter.chapter_number}
                        </span>
                        {purchased && (
                          <span className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 px-2 py-1 rounded-full">
                            Owned
                          </span>
                        )}
                      </div>

                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                        {chapter.title}
                      </h3>

                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-3">
                        {chapter.description}
                      </p>

                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                          ₹{chapter.price}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {chapter.content_type === 'pdf' ? 'PDF' : 'Text'} →
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {books.length === 0 && chapters.length === 0 && (
          <div className="gothic-card rounded-lg p-12 text-center relative overflow-hidden">
            <div className="corner-ornament corner-ornament-tl"></div>
            <div className="corner-ornament corner-ornament-tr"></div>
            <div className="corner-ornament corner-ornament-bl"></div>
            <div className="corner-ornament corner-ornament-br"></div>
            
            <div className="empty-state">
              Captivating stories coming soon...<br />
              <br />
              stay tuned!!
            </div>
          </div>
        )}
      </div>
    </div>
  );
}