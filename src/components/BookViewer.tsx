import { useState, useEffect } from 'react';
import { ArrowLeft, Lock, ShoppingCart, BookOpen } from 'lucide-react';
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

type BookViewProps = {
  bookId: string;
  onBack: () => void;
};

export function BookView({ bookId, onBack }: BookViewProps) {
  const [book, setBook] = useState<BookType | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  
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
        onBack();
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
      .eq('payment_status', 'completed')
      .order('purchased_at', { ascending: false }); // ✅ Order by latest first

    if (error) {
      console.error('Error loading purchases:', error);
      throw error;
    }
    
    console.log('Loaded purchases:', purchaseData); // ✅ Debug log
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

  // ✅ FIXED: Single Chapter Purchase
  const handlePurchaseChapter = async (chapter: Chapter) => {
    if (!user) {
      alert('Please sign in to purchase');
      return;
    }

    setPurchasing(true);

    try {
      // Get Supabase session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      // Create order via edge function
      const orderResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-order`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            chapterId: chapter.id,
            amount: chapter.price,
          }),
        }
      );

      // ✅ Handle "already purchased" error
    if (!orderResponse.ok) {
      const errorData = await orderResponse.json();
      
      if (errorData.alreadyOwned) {
        // Chapter is already purchased, just reload and open
        await loadBookData();
        const index = chapters.findIndex(ch => ch.id === chapter.id);
        if (index >= 0) {
          setCurrentChapterIndex(index);
          setReadingChapterId(chapter.id);
        }
        return;
      }
      
      throw new Error(errorData.error || 'Failed to create order');
    }

    const orderData = await orderResponse.json();

    if (!orderData.orderId) {
      throw new Error('Failed to create order');
    }

      

      // Open Razorpay modal
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: chapter.price * 100,
        currency: 'INR',
        name: 'MemoryCraver',
        description: chapter.title,
        order_id: orderData.orderId,
        handler: async function (response: any) {
          try {
            // Verify payment via edge function
            const verifyResponse = await fetch(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-payment`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${session.access_token}`,
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
            await loadBookData(); // ✅ Reload purchases
          } else {
            alert('Payment verification failed. Please contact support.');
          }
        } catch (error) {
          console.error('Verification error:', error);
          alert('Payment verification failed. Please contact support.');
        } finally {
          setPurchasing(false);
        }
      },
      prefill: {
        name: profile?.full_name || '',
        email: user?.email || '',
      },
      theme: {
        color: '#d4af37',
      },
      modal: {
        ondismiss: function() {
          setPurchasing(false);
        }
      }
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  } catch (error: any) {
    console.error('Purchase error:', error);
    alert(error.message || 'Failed to initiate purchase. Please try again.');
    setPurchasing(false);
  }
};

  // ✅ FIXED: Bulk Purchase (Buy All Chapters)
  const handleBuyAllChapters = async () => {
    if (!user || unpurchasedChapters.length === 0) {
      alert('No chapters to purchase');
      return;
    }

    setPurchasing(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const chapterIds = unpurchasedChapters.map(ch => ch.id);

      // Create bulk order
      const orderResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-bulk-order`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            chapterIds: chapterIds,
            totalAmount: totalRemainingCost,
            bookId: bookId,
          }),
        }
      );

      if (!orderResponse.ok) {
        const errorText = await orderResponse.text();
        throw new Error(`Failed to create bulk order: ${errorText}`);
      }

      const orderData = await orderResponse.json();

      if (!orderData.orderId) {
        throw new Error('Failed to create bulk order');
      }

      // Open Razorpay modal
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
                  'Authorization': `Bearer ${session.access_token}`,
                  'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
                },
                body: JSON.stringify({
                  razorpayOrderId: response.razorpay_order_id,
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpaySignature: response.razorpay_signature,
                  chapterIds: chapterIds,
                }),
              }
            );

            const verifyData = await verifyResponse.json();

            if (verifyData.success) {
              alert(`Payment successful! ${verifyData.chaptersUnlocked} chapters unlocked.`);
              await loadBookData();
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
    } catch (error: any) {
      console.error('Bulk purchase error:', error);
      alert(error.message || 'Failed to initiate bulk purchase. Please try again.');
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
      <div className="min-h-screen bg-gothic-darkest flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
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

  return (
    <div className="min-h-screen bg-gothic-darkest">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-gothic-dark/95 backdrop-blur-sm border-b border-accent-maroon/30">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-text-muted hover:text-primary transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="font-lora">Back to Store</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Book Hero Section */}
        <div className="grid md:grid-cols-[300px_1fr] gap-8 mb-8">
          {/* Book Cover */}
          <div>
            {book.cover_image_url ? (
              <img
                src={book.cover_image_url}
                alt={book.title}
                className="w-full rounded-lg shadow-gothic border-2 border-accent-maroon/30"
              />
            ) : (
              <div className="w-full aspect-[2/3] bg-gothic-mid rounded-lg flex items-center justify-center border-2 border-accent-maroon/30">
                <BookOpen size={64} className="text-text-muted" />
              </div>
            )}
          </div>

          {/* Book Info */}
          <div>
            <h1 className="text-4xl font-cinzel font-bold text-primary mb-4">
              {book.title}
            </h1>
            
            <div className="prose prose-lg max-w-none mb-6">
              <p className="text-text-light font-cormorant italic text-lg leading-relaxed whitespace-pre-wrap">
                {book.description}
              </p>
            </div>

            {book.author_note && (
              <div className="bg-gothic-mid p-4 rounded-lg border border-accent-maroon/20 mb-6">
                <p className="text-sm font-cinzel text-primary mb-2">Author's Note</p>
                <p className="text-text-muted font-cormorant italic">
                  {book.author_note}
                </p>
              </div>
            )}

            <div className="flex items-center gap-6 text-text-muted mb-6">
              <div className="flex items-center gap-2">
                <BookOpen size={20} className="text-primary" />
                <span className="font-lora">{chapters.length} chapters</span>
              </div>
              {user && unpurchasedChapters.length > 0 && (
                <div className="font-lora text-sm">
                  {chapters.length - unpurchasedChapters.length} owned
                </div>
              )}
            </div>

            {/* Buy All Banner */}
            {unpurchasedChapters.length > 0 && user && profile?.role !== 'author' && (
              <div className="bg-gradient-to-r from-accent-maroon/20 to-primary/20 rounded-lg p-4 border border-primary/30">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-cinzel text-primary mb-1">
                      Buy All Chapters
                    </h3>
                    <p className="text-sm text-text-muted font-lora">
                      Unlock {unpurchasedChapters.length} chapter{unpurchasedChapters.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary font-cinzel">
                      ₹{totalRemainingCost.toFixed(2)}
                    </p>
                    <button
                      onClick={handleBuyAllChapters}
                      disabled={purchasing}
                      className="mt-2 btn-gold px-6 py-2 rounded-lg font-cinzel text-sm disabled:opacity-50"
                    >
                      {purchasing ? 'Processing...' : 'Buy All'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Chapters Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-cinzel text-primary mb-6">Chapters</h2>
          
          {chapters.length === 0 ? (
            <div className="text-center py-12 text-text-muted font-lora">
              No chapters available yet
            </div>
          ) : (
            <div className="grid gap-3">
              {chapters.map((chapter, index) => {
                const purchased = isChapterPurchased(chapter.id);
                return (
                  <div
                    key={chapter.id}
                    onClick={() => handleReadChapter(chapter, index)}
                    className="bg-gothic-mid p-4 rounded-lg border border-accent-maroon/20 hover:border-primary/50 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-primary font-cinzel text-sm">
                            Chapter {chapter.chapter_number}
                          </span>
                          {purchased ? (
                            <span className="text-xs bg-green-900/30 text-green-400 px-2 py-1 rounded-full font-lora">
                              Owned
                            </span>
                          ) : (
                            <span className="text-xs bg-accent-maroon/30 text-accent-maroon-light px-2 py-1 rounded-full font-lora flex items-center gap-1">
                              <Lock size={12} />
                              ₹{chapter.price}
                            </span>
                          )}
                        </div>
                        <h4 className="text-text-light font-lora font-semibold group-hover:text-primary transition-colors">
                          {chapter.title}
                        </h4>
                        <p className="text-text-muted text-sm font-cormorant mt-1">
                          {chapter.description}
                        </p>
                      </div>
                      <div className="ml-4 flex-shrink-0">
                        {purchased ? (
                          <button className="px-4 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors font-cinzel text-sm">
                            Read
                          </button>
                        ) : (
                          <button className="px-4 py-2 bg-accent-maroon/20 text-accent-maroon-light rounded-lg hover:bg-accent-maroon/30 transition-colors font-cinzel text-sm flex items-center gap-2">
                            <ShoppingCart size={16} />
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

        {/* Book Comments */}
        <div className="bg-gothic-mid rounded-lg p-6 border border-accent-maroon/20">
          <h2 className="text-xl font-cinzel text-primary mb-4">Discussion</h2>
          <div className="max-h-96 overflow-y-auto">
            <BookCommentSection bookId={bookId} />
          </div>
        </div>
      </div>
    </div>
  );
}