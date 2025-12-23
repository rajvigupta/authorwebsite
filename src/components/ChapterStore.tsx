import { useState, useEffect } from 'react';
import { BookOpen, Lock, Download, Book, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { BookViewer } from './BookViewer';
import { RichTextViewer } from './RichTextViewer';
import { CommentVoteSection } from './CommentVoteSection';
import { AuthorProfileSection } from './AuthorProfileSection';
import type { Chapter, Purchase, Book as BookType, Profile } from '../lib/supabase';

declare global {
  interface Window {
    Razorpay: any;
  }
}

type ContentView = 'store' | 'chapter' | 'book';

export function ChapterStore() {
  const [books, setBooks] = useState<BookType[]>([]);
  const [bookChapterCounts, setBookChapterCounts] = useState<Record<string, number>>({});
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [authorProfile, setAuthorProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ContentView>('store');
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
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
      // Get the author's profile (assuming there's only one author)
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

      // Get chapter counts for each book
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

  const getBookPurchasedCount = (bookId: string) => {
    // Count how many chapters in this book the user owns
    return purchases.filter(p => 
      chapters.some(c => c.id === p.chapter_id && c.book_id === bookId)
    ).length;
  };

  const handlePurchaseChapter = async (chapter: Chapter) => {
    if (!user) {
      alert('Please sign in to purchase chapters');
      return;
    }

    try {
      const orderResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-order`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            chapterId: chapter.id,
            amount: chapter.price,
          }),
        }
      );

      const orderData = await orderResponse.json();

      if (!orderData.orderId) {
        throw new Error('Failed to create order');
      }

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: chapter.price * 100,
        currency: 'INR',
        name: 'MemoryCraver',
        description: `${chapter.title}`,
        order_id: orderData.orderId,
        handler: async function (response: any) {
          try {
            const verifyResponse = await fetch(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-payment`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                },
                body: JSON.stringify({
                  razorpayOrderId: response.razorpay_order_id,
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpaySignature: response.razorpay_signature,
                  chapterId: chapter.id,
                }),
              }
            );

            const verifyData = await verifyResponse.json();

            if (verifyData.success) {
              alert('Payment successful!');
              fetchPurchases();
            } else {
              alert('Payment verification failed. Please contact support.');
            }
          } catch (error) {
            console.error('Verification error:', error);
            alert('Payment verification failed. Please contact support.');
          }
        },
        prefill: {
          name: profile?.full_name || '',
          email: profile?.email || '',
        },
        theme: {
          color: '#2563eb',
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error('Purchase error:', error);
      alert('Failed to initiate purchase. Please try again.');
    }
  };

  const handleViewChapter = (chapter: Chapter) => {
    setSelectedChapter(chapter);
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
      <div className="text-center py-12">
        <p className="text-gray-600 dark:text-gray-400">Loading content...</p>
      </div>
    );
  }

  if (view === 'book' && selectedBook) {
    return <BookViewer bookId={selectedBook} onClose={handleCloseView} />;
  }

  if (view === 'chapter' && selectedChapter) {
    const purchased = isPurchased(selectedChapter.id);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Chapter {selectedChapter.chapter_number}: {selectedChapter.title}
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  {selectedChapter.description}
                </p>
                <p className="text-primary-600 dark:text-primary-400 font-bold text-xl mt-2">
                  ₹{selectedChapter.price}
                </p>
              </div>
              <button
                onClick={handleCloseView}
                className="ml-4 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {!purchased && profile?.role !== 'author' ? (
              <div className="text-center py-12">
                <Lock size={64} className="mx-auto text-gray-400 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Purchase Required
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Purchase this chapter to access the content
                </p>
                <button
                  onClick={() => handlePurchaseChapter(selectedChapter)}
                  className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  Purchase for ₹{selectedChapter.price}
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {selectedChapter.content_type === 'pdf' && selectedChapter.pdf_url ? (
                  <div className="space-y-4">
                    <a
                      href={selectedChapter.pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 w-fit"
                    >
                      <Download size={20} />
                      Download PDF
                    </a>
                    <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-6">
                      <p className="text-gray-600 dark:text-gray-400">
                        Click the button above to download and read this chapter
                      </p>
                    </div>
                  </div>
                ) : selectedChapter.content_type === 'text' && selectedChapter.rich_content ? (
                  <div className="bg-time-blue-dark rounded-lg border border-time-grey-700 p-6">
                    <RichTextViewer 
                      content={selectedChapter.rich_content as any}
                      userEmail={user?.email}
                    />
                  </div>
                ) : null}

                <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-6">
                  <CommentVoteSection 
                    chapterId={selectedChapter.id}
                    isPurchased={purchased || profile?.role === 'author'}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

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
            add something here//@1234
          </p>
        </div>

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
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow cursor-pointer"
                  onClick={() => handleViewBook(book.id)}
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
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow cursor-pointer"
                  onClick={() => handleViewChapter(chapter)}
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
            {/* Corner ornaments */}
            <div className="corner-ornament corner-ornament-tl"></div>
            <div className="corner-ornament corner-ornament-tr"></div>
            <div className="corner-ornament corner-ornament-bl"></div>
            <div className="corner-ornament corner-ornament-br"></div>
            
            <div className="empty-state">
             Captivating stories coming soon...<br />
              <br />
              <br />
              stay tuned!!
          
            </div>
          </div>
        )}
      </div>
    </div>
  );


}