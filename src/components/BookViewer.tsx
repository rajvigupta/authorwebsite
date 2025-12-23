import { useState, useEffect } from 'react';
import { X, Lock, ShoppingCart, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { BookCommentSection } from './BookCommentSection';
import { ChapterReader } from './ChapterReader';
import type { Book as BookType, Chapter, Purchase } from '../lib/supabase';

declare global {
  interface Window {
    Razorpay: any;
  }
}

type BookViewerProps = {
  bookId: string;
  onClose: () => void;
};

export function BookViewer({ bookId, onClose }: BookViewerProps) {
  const [book, setBook] = useState<BookType | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  
  const [readingChapterId, setReadingChapterId] = useState<string | null>(null);
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  
  const { user, profile } = useAuth();

  useEffect(() => {
    loadBookData();
  }, [bookId]);

  const loadBookData = async () => {
    try {
      const { data: bookData, error: bookError } = await supabase
        .from('books')
        .select('*')
        .eq('id', bookId)
        .maybeSingle();

      if (bookError) throw bookError;
      if (!bookData) {
        alert('Book not found');
        onClose();
        return;
      }

      setBook(bookData);

      const { data: chaptersData, error: chaptersError } = await supabase
        .from('chapters')
        .select('*')
        .eq('book_id', bookId)
        .eq('is_published', true)
        .order('chapter_number');

      if (chaptersError) throw chaptersError;
      setChapters(chaptersData || []);

      if (user) {
        await loadPurchases();
      }
    } catch (error) {
      console.error('Error loading book:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPurchases = async () => {
    if (!user) return;
    
    try {
      const { data: purchaseData, error } = await supabase
        .from('purchases')
        .select('*')
        .eq('user_id', user.id)
        .eq('payment_status', 'completed');

      if (error) throw error;
      setPurchases(purchaseData || []);
    } catch (error) {
      console.error('Error loading purchases:', error);
    }
  };

  const isChapterPurchased = (chapterId: string) => {
    if (profile?.role === 'author') return true;
    return purchases.some(p => p.chapter_id === chapterId);
  };

  const unpurchasedChapters = chapters.filter(ch => !isChapterPurchased(ch.id));
  const totalRemainingCost = unpurchasedChapters.reduce((sum, ch) => sum + ch.price, 0);

  const handlePurchaseChapter = async (chapter: Chapter) => {
    if (!user) {
      alert('Please sign in to purchase chapters');
      return;
    }

    setPurchasing(true);

    try {
      const orderResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-order`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
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
        description: `${book?.title} - ${chapter.title}`,
        order_id: orderData.orderId,
        handler: async function (response: any) {
          try {
            const verifyResponse = await fetch(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-payment`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                  'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
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
              alert('Payment successful! Chapter unlocked.');
              await loadPurchases();
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
          email: user?.email || '',
        },
        theme: {
          color: '#d4af37',
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error('Purchase error:', error);
      alert('Failed to initiate purchase. Please try again.');
    } finally {
      setPurchasing(false);
    }
  };

  const handleBuyAllChapters = async () => {
    if (!user) {
      alert('Please sign in to purchase');
      return;
    }

    if (unpurchasedChapters.length === 0) {
      alert('You already own all chapters!');
      return;
    }

    setPurchasing(true);

    try {
      const orderResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-bulk-order`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            chapterIds: unpurchasedChapters.map(ch => ch.id),
            totalAmount: totalRemainingCost,
            bookId: bookId,
          }),
        }
      );

      const orderData = await orderResponse.json();

      if (!orderData.orderId) {
        throw new Error(orderData.error || 'Failed to create order');
      }

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: totalRemainingCost * 100,
        currency: 'INR',
        name: 'MemoryCraver',
        description: `${book?.title} - ${unpurchasedChapters.length} chapters`,
        order_id: orderData.orderId,
        handler: async function (response: any) {
          try {
            const verifyResponse = await fetch(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-bulk-payment`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                  'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
                },
                body: JSON.stringify({
                  razorpayOrderId: response.razorpay_order_id,
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpaySignature: response.razorpay_signature,
                  chapterIds: unpurchasedChapters.map(ch => ch.id),
                }),
              }
            );

            const verifyData = await verifyResponse.json();

            if (verifyData.success) {
              alert(`Payment successful! ${verifyData.chaptersUnlocked} chapters unlocked.`);
              await loadPurchases();
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
          email: user?.email || '',
        },
        theme: {
          color: '#d4af37',
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error('Purchase error:', error);
      alert('Failed to initiate purchase. Please try again.');
    } finally {
      setPurchasing(false);
    }
  };

  const handleReadChapter = (chapter: Chapter, index: number) => {
    if (!isChapterPurchased(chapter.id) && profile?.role !== 'author') {
      handlePurchaseChapter(chapter);
      return;
    }
    setCurrentChapterIndex(index);
    setReadingChapterId(chapter.id);
  };

  const handleCloseReader = () => {
    setReadingChapterId(null);
  };

  const handlePrevChapter = () => {
    if (currentChapterIndex > 0) {
      const prevIndex = currentChapterIndex - 1;
      setCurrentChapterIndex(prevIndex);
      setReadingChapterId(chapters[prevIndex].id);
    }
  };

  const handleNextChapter = () => {
    if (currentChapterIndex < chapters.length - 1) {
      const nextIndex = currentChapterIndex + 1;
      setCurrentChapterIndex(nextIndex);
      setReadingChapterId(chapters[nextIndex].id);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-gothic-dark rounded-lg p-8">
          <p className="text-text-light font-lora">Loading book...</p>
        </div>
      </div>
    );
  }

  if (!book) return null;

  if (readingChapterId) {
    return (
      <ChapterReader
        chapterId={readingChapterId}
        bookTitle={book.title}
        onClose={handleCloseReader}
        onPrevChapter={handlePrevChapter}
        onNextChapter={handleNextChapter}
        hasPrevChapter={currentChapterIndex > 0}
        hasNextChapter={currentChapterIndex < chapters.length - 1}
      />
    );
  }

  // Truncate description if too long
  const descriptionLimit = 500;
  const shouldTruncate = book.description.length > descriptionLimit;
  const displayDescription = showFullDescription || !shouldTruncate
    ? book.description
    : book.description.slice(0, descriptionLimit) + '...';

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gothic-dark rounded-lg shadow-gothic w-full max-w-6xl h-[90vh] flex flex-col relative border-2 border-accent-maroon/30">
        {/* Close Button - Fixed */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 text-text-muted hover:text-primary transition-colors bg-gothic-dark/80 rounded-full p-2"
        >
          <X size={24} />
        </button>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Book Header - Cover + Info */}
          <div className="p-6 border-b border-accent-maroon/30">
            <div className="flex gap-6">
              {/* Cover */}
              {book.cover_image_url && (
                <img
                  src={book.cover_image_url}
                  alt={book.title}
                  className="w-48 h-64 object-cover rounded-lg shadow-gold border-2 border-accent-maroon/30 flex-shrink-0"
                />
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h2 className="text-3xl font-cinzel font-bold text-primary mb-3">
                  {book.title}
                </h2>
                
                <div className="text-text-light font-cormorant text-base leading-relaxed mb-3 whitespace-pre-line">

                  {displayDescription}
                  {shouldTruncate && (
                    <button
                      onClick={() => setShowFullDescription(!showFullDescription)}
                      className="ml-2 text-primary hover:text-primary-light font-lora text-sm inline-flex items-center gap-1"
                    >
                      {showFullDescription ? (
                        <>Show less <ChevronUp size={14} /></>
                      ) : (
                        <>Read more <ChevronDown size={14} /></>
                      )}
                    </button>
                  )}
                </div>

                {book.author_note && (
                  <div className="bg-gothic-mid p-3 rounded-lg border border-accent-maroon/20 mb-3">
                    <p className="text-xs font-cinzel text-primary mb-1">Author's Note</p>
                    <p className="text-text-muted font-cormorant italic text-sm">
                      {book.author_note}
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-text-muted">
                    <BookOpen size={20} className="text-primary" />
                    <span className="font-lora text-sm">{chapters.length} chapters</span>
                  </div>
                  {user && unpurchasedChapters.length > 0 && (
                    <div className="text-text-muted font-lora text-xs">
                      {chapters.length - unpurchasedChapters.length} owned
                    </div>
                  )}
                </div>

                {/* Buy All Banner */}
                {unpurchasedChapters.length > 0 && user && profile?.role !== 'author' && (
                  <div className="mt-4 bg-gradient-to-r from-accent-maroon/20 to-primary/20 rounded-lg p-3 border border-primary/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-cinzel text-primary">
                          Buy All Remaining Chapters
                        </h3>
                        <p className="text-xs text-text-muted font-lora">
                          Get {unpurchasedChapters.length} chapter{unpurchasedChapters.length !== 1 ? 's' : ''} instantly
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-primary font-cinzel">
                          ₹{totalRemainingCost.toFixed(2)}
                        </p>
                        <button
                          onClick={handleBuyAllChapters}
                          disabled={purchasing}
                          className="mt-1 btn-gold px-4 py-1.5 rounded-lg font-cinzel text-xs disabled:opacity-50"
                        >
                          {purchasing ? 'Processing...' : 'Buy All'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Chapters Section */}
          <div className="p-6">
            <h3 className="text-xl font-cinzel text-primary mb-4 flex items-center gap-2">
              <BookOpen size={24} />
              Chapters
            </h3>

            {chapters.length === 0 ? (
              <div className="text-center py-12 text-text-muted font-lora">
                No chapters available yet
              </div>
            ) : (
              <div className="grid gap-2">
                {chapters.map((chapter, index) => {
                  const purchased = isChapterPurchased(chapter.id);
                  return (
                    <div
                      key={chapter.id}
                      onClick={() => handleReadChapter(chapter, index)}
                      className="bg-gothic-mid p-3 rounded-lg border border-accent-maroon/20 hover:border-primary/50 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-primary font-cinzel text-xs">
                              Chapter {chapter.chapter_number}
                            </span>
                            {purchased ? (
                              <span className="text-[10px] bg-green-900/30 text-green-400 px-1.5 py-0.5 rounded-full font-lora">
                                Owned
                              </span>
                            ) : (
                              <span className="text-[10px] bg-accent-maroon/30 text-accent-maroon-light px-1.5 py-0.5 rounded-full font-lora flex items-center gap-1">
                                <Lock size={10} />
                                ₹{chapter.price}
                              </span>
                            )}
                          </div>
                          <h4 className="text-text-light font-lora text-sm font-semibold group-hover:text-primary transition-colors truncate">
                            {chapter.title}
                          </h4>
                          <p className="text-text-muted text-xs font-cormorant mt-0.5 line-clamp-1">
                            {chapter.description}
                          </p>
                        </div>
                        <div className="ml-3 flex-shrink-0">
                          {purchased ? (
                            <button className="px-3 py-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors font-cinzel text-xs">
                              Read
                            </button>
                          ) : (
                            <button className="px-3 py-1.5 bg-accent-maroon/20 text-accent-maroon-light rounded-lg hover:bg-accent-maroon/30 transition-colors font-cinzel text-xs flex items-center gap-1.5">
                              <ShoppingCart size={12} />
                              Buy
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Comments Section */}
          <div className="border-t border-accent-maroon/30 p-6">
            <BookCommentSection bookId={bookId} />
          </div>
        </div>
      </div>
    </div>
  );
}