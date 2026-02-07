import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock, ShoppingCart, Palette } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { RichTextViewer } from './RichTextViewer';
import { CommentVoteSection } from './CommentVoteSection';
import { useScreenshotPrevention } from '../hooks/useScreenshotPrevention';
import { SecureImageViewer } from './SecureImageViewer';
import { useToast } from './Toast';
import type { Chapter, Purchase } from '../lib/supabase';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export function StandaloneChapterView() {
  const { chapterId } = useParams<{ chapterId: string }>();
  const navigate = useNavigate();
  
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const { user, profile } = useAuth();
  const toast = useToast();

  const [theme, setTheme] = useState<'gothic' | 'light' | 'dark'>('gothic');

  useEffect(() => {
    const savedTheme = localStorage.getItem('reading-theme') as 'gothic' | 'light' | 'dark';
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    if (chapterId) {
      loadChapterData();
    } else {
      navigate('/');
    }
  }, [chapterId]);

  useScreenshotPrevention({
    userEmail: user?.email,
    contentType: chapter?.content_type || 'text',
  });

  const handleThemeChange = (newTheme: 'gothic' | 'light' | 'dark') => {
    setTheme(newTheme);
    localStorage.setItem('reading-theme', newTheme);
    setShowThemeSelector(false);
  };

  const getThemeClass = () => {
    if (theme === 'light') return 'reading-theme-light';
    if (theme === 'dark') return 'reading-theme-dark';
    return '';
  };

  const getThemeDetails = (themeType: 'gothic' | 'light' | 'dark') => {
    switch(themeType) {
      case 'gothic':
        return { icon: '🌲', label: 'Gothic Green' };
      case 'light':
        return { icon: '📖', label: 'Classic White'};
      case 'dark':
        return { icon: '🌙', label: 'Dark Mode' };
    }
  };

  const currentTheme = getThemeDetails(theme);

  const loadChapterData = async () => {
    if (!chapterId) return;

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
    if (chapter?.is_free) return true;
    return purchase !== null;
  };

  const handlePurchase = async () => {
    if (!user || !chapter) {
      toast.error('Please sign in to purchase');
      return;
    }

    setPurchasing(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      toast.info('Creating payment order...');

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
          toast.info('You already own this chapter! Refreshing...');
          await loadChapterData();
          return;
        }
        
        throw new Error(errorData.error || 'Failed to create order');
      }

      const orderData = await orderResponse.json();

      if (!orderData.orderId) {
        throw new Error('No order ID returned');
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
            toast.info('Verifying payment...');
            
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
              toast.success('🎉 Payment successful! Chapter unlocked.', 6000);
              await loadChapterData();
            } else {
              toast.error('Payment verification failed. Please contact support.');
            }
          } catch (error) {
            console.error('Verification error:', error);
            toast.error('Payment verification failed. Please contact support.');
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
      toast.error(error.message || 'Failed to initiate purchase. Please try again.');
      setPurchasing(false);
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gothic-darkest flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!chapter) {
    return (
      <div className="min-h-screen bg-gothic-darkest flex items-center justify-center">
        <div className="text-center">
          <p className="text-text-light mb-4 font-lora">Chapter not found</p>
          <button onClick={handleBack} className="btn-gold px-6 py-2 rounded-lg">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const purchased = isPurchased();

  return (
    <div className={`min-h-screen bg-gothic-darkest ${getThemeClass()}`}>
      
      {/* Sticky Header with Theme Selector */}
      <div className="sticky top-0 z-10 bg-gothic-dark/95 backdrop-blur-sm border-b border-accent-maroon/30">
        <div className="max-w-4xl mx-auto px-3 md:px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-text-muted hover:text-primary transition-colors shrink-0"
            >
              <ArrowLeft size={20} />
              <span className="font-lora text-sm md:text-base hidden sm:inline">Back</span>
            </button>

            {/* Title in center (only show when purchased) */}
            {purchased && (
              <div className="text-center flex-1 px-2 md:px-4 min-w-0 overflow-hidden">
                <h1 className="text-sm md:text-lg font-cinzel text-primary truncate">
                  Ch {chapter.chapter_number}: {chapter.title}
                </h1>
              </div>
            )}

            {/* Theme Selector (only show when purchased) */}
            {purchased && (
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
                      
                      <div 
                        className="absolute right-0 mt-2 bg-gothic-mid rounded-lg shadow-2xl border-2 border-accent-maroon/30 overflow-hidden w-[260px] md:min-w-[280px] z-[103]"
                      >
                        <div className="p-2">
                          <p className="text-xs font-cinzel text-primary px-3 py-2 tracking-wider">
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
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Chapter Header */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="text-primary font-cinzel">Chapter {chapter.chapter_number}</span>
            {chapter.is_free ? (
              <span className="text-2xl font-bold text-green-400 font-cinzel">
                FREE
              </span>
            ) : (
              <span className="text-2xl font-bold text-primary font-cinzel">₹{chapter.price}</span>
            )}
          </div>
          <h1 className="text-4xl font-cinzel font-bold text-primary mb-4">
            {chapter.title}
          </h1>
          <p className="text-text-muted font-cormorant italic text-lg">
            {chapter.description}
          </p>
        </div>

        {/* Purchase / Content Section */}
        {!purchased ? (
          <div className="bg-gothic-mid rounded-lg p-12 text-center border border-accent-maroon/20 mb-8">
            <Lock size={64} className="mx-auto text-primary mb-6" />
            <h3 className="text-2xl font-cinzel text-primary mb-4">
              {chapter.is_free ? 'Sign In to Read' : 'Purchase to Read'}
            </h3>
            <p className="text-text-muted font-lora mb-6">
              {chapter.is_free 
                ? 'This chapter is free! Sign in to access the full content'
                : 'Unlock this chapter to access the full content'
              }
            </p>
            {chapter.is_free ? (
              user ? (
                <p className="text-text-muted font-lora text-sm">
                  Refreshing... This chapter should be accessible
                </p>
              ) : (
                <p className="text-text-muted font-lora text-sm">
                  Please sign in to read this free chapter
                </p>
              )
            ) : (
              <button
                onClick={handlePurchase}
                disabled={purchasing || !user}
                className="btn-gold px-8 py-3 rounded-lg font-cinzel inline-flex items-center gap-2 disabled:opacity-50"
              >
                <ShoppingCart size={20} />
                {purchasing ? 'Processing...' : `Purchase for ₹${chapter.price}`}
              </button>
            )}
            {!user && !chapter.is_free && (
              <p className="text-text-muted font-lora text-sm mt-4">
                Please sign in to purchase
              </p>
            )}
          </div>
        ) : (
          <>
            {/* Chapter Content */}
            <div className="bg-gothic-mid rounded-lg border border-accent-maroon/20 p-4 md:p-8 mb-6 md:mb-8 shadow-gothic">
              {chapter.rich_content && Array.isArray(chapter.rich_content) ? (
                chapter.rich_content.length > 0 && chapter.rich_content[0]?.type === 'page-image' ? (
                  <SecureImageViewer
                    pages={chapter.rich_content as any}
                    userEmail={user?.email || 'Unknown User'}
                    chapterTitle={chapter.title}
                  />
                ) : (
                  <RichTextViewer 
                    content={chapter.rich_content as any}
                    userEmail={user?.email}
                    theme={theme}
                  />
                )
              ) : (
                <div className="text-center py-12 text-text-muted font-lora">
                  No content available
                </div>
              )}
            </div>

            {/* Ornamental Divider */}
            <div className="ornamental-divider my-12"></div>

            {/* Chapter Comments */}
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