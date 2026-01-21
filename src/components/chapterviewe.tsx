import { useState, useEffect } from 'react';
import { ArrowLeft, Lock, ShoppingCart, Palette } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { RichTextViewer } from './RichTextViewer';
import { CommentVoteSection } from './CommentVoteSection';
import type { Chapter, Purchase } from '../lib/supabase';

declare global {
  interface Window {
    Razorpay: any;
  }
}

type StandaloneChapterViewProps = {
  chapterId: string;
  onBack: () => void;
};

type ReadingTheme = 'gothic' | 'light' | 'dark';

export function StandaloneChapterView({ chapterId, onBack }: StandaloneChapterViewProps) {
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [theme, setTheme] = useState<ReadingTheme>('gothic');
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const { user, profile } = useAuth();

  useEffect(() => {
    const savedTheme = localStorage.getItem('reading-theme') as ReadingTheme;
    if (savedTheme && (savedTheme === 'gothic' || savedTheme === 'light' || savedTheme === 'dark')) {
      setTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    loadChapterData();
  }, [chapterId]);

  const loadChapterData = async () => {
    try {
      const { data: chapterData, error: chapterError } = await supabase
        .from('chapters')
        .select('*')
        .eq('id', chapterId)
        .single();

      if (chapterError) throw chapterError;
      setChapter(chapterData);

      if (user) {
        const { data: purchaseData } = await supabase
          .from('purchases')
          .select('*')
          .eq('user_id', user.id)
          .eq('chapter_id', chapterId)
          .eq('payment_status', 'completed')
          .maybeSingle();

        setPurchase(purchaseData);
      }
    } catch (error) {
      console.error('Error loading chapter:', error);
    } finally {
      setLoading(false);
    }
  };

  const isPurchased = () => {
    if (profile?.role === 'author') return true;
    return purchase !== null;
  };

  const handleThemeChange = (newTheme: ReadingTheme) => {
    setTheme(newTheme);
    localStorage.setItem('reading-theme', newTheme);
    setShowThemeSelector(false);
  };

  const handlePurchase = async () => {
    if (!user || !chapter) {
      alert('Please sign in to purchase');
      return;
    }

    setPurchasing(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

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

      if (!orderResponse.ok) {
        const errorData = await orderResponse.json();
        if (errorData.alreadyOwned) {
          await loadChapterData();
          return;
        }
        throw new Error(errorData.error || 'Failed to create order');
      }

      const orderData = await orderResponse.json();

      if (!orderData.orderId) {
        throw new Error('Failed to create order');
      }

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: chapter.price * 100,
        currency: 'INR',
        name: 'MemoryCraver',
        description: chapter.title,
        order_id: orderData.orderId,
        handler: async function (response: any) {
          try {
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
              await loadChapterData();
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gothic-darkest flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!chapter) return null;

  const purchased = isPurchased();

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
    <div className={`min-h-screen bg-gothic-darkest ${getThemeClass()}`}>
      <div className="sticky top-0 z-[100] bg-gothic-dark/95 backdrop-blur-sm border-b border-accent-maroon/30">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-text-muted hover:text-primary transition-colors"
            >
              <ArrowLeft size={20} />
              <span className="font-lora">Back to Store</span>
            </button>

            {purchased && (
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
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="text-primary font-cinzel">Chapter {chapter.chapter_number}</span>
            <span className="text-2xl font-bold text-primary font-cinzel">₹{chapter.price}</span>
          </div>
          <h1 className="text-4xl font-cinzel font-bold text-primary mb-4">
            {chapter.title}
          </h1>
          <p className="text-text-muted font-cormorant italic text-lg">
            {chapter.description}
          </p>
        </div>

        {!purchased ? (
          <div className="bg-gothic-mid rounded-lg p-12 text-center border border-accent-maroon/20 mb-8">
            <Lock size={64} className="mx-auto text-primary mb-6" />
            <h3 className="text-2xl font-cinzel text-primary mb-4">
              Purchase to Read
            </h3>
            <p className="text-text-muted font-lora mb-6">
              Unlock this chapter to access the full content
            </p>
            <button
              onClick={handlePurchase}
              disabled={purchasing || !user}
              className="btn-gold px-8 py-3 rounded-lg font-cinzel inline-flex items-center gap-2 disabled:opacity-50"
            >
              <ShoppingCart size={20} />
              {purchasing ? 'Processing...' : `Purchase for ₹${chapter.price}`}
            </button>
            {!user && (
              <p className="text-text-muted font-lora text-sm mt-4">
                Please sign in to purchase
              </p>
            )}
          </div>
        ) : (
          <>
            <div className="bg-gothic-mid rounded-lg p-8 mb-8 border border-accent-maroon/20 shadow-gothic">
              {chapter.content_type === 'pdf' && chapter.pdf_url ? (
                <div className="relative">
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

            <div className="ornamental-divider my-12"></div>

            <div className="bg-gothic-mid rounded-lg p-6 border border-accent-maroon/20">
              <h2 className="text-2xl font-cinzel text-primary mb-6">
                Chapter Discussion
              </h2>
              <CommentVoteSection 
                chapterId={chapter.id}
                isPurchased={purchased}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}