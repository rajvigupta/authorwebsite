import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock, ShoppingCart } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { RichTextViewer } from './RichTextViewer';
import { CommentVoteSection } from './CommentVoteSection';
import type { Chapter, Purchase } from '../lib/supabase';
import { useToast } from './Toast';

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
  const { user, profile } = useAuth();
  const toast = useToast();

  useEffect(() => {
    if (chapterId) {
      loadChapterData();
    } else {
      navigate('/');
    }
  }, [chapterId]);

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
      alert('Please sign in to purchase');
      return;
    }

    setPurchasing(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      console.log('Creating order for chapter:', chapter.id);

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

      console.log('Order response status:', orderResponse.status);

      if (!orderResponse.ok) {
        const errorData = await orderResponse.json();
        console.error('Order creation error:', errorData);
        
        if (errorData.alreadyOwned) {
          await loadChapterData();
          return;
        }
        
        throw new Error(errorData.error || 'Failed to create order');
      }

      const orderData = await orderResponse.json();
      console.log('Order created:', orderData);

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
            console.log('Verification result:', verifyData);

            if (verifyData.success) {
               toast.success('🎉 Payment successful! Chapter unlocked.', 6000); // ✅ NEW
            } else {
              toast.error('Payment verification failed. Please contact support.'); // ✅ NEW
            }
          } catch (error) {
            console.error('Verification error:', error);
            toast.error('Payment verification failed. Please contact support.'); // ✅ NEW
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
            console.log('Payment modal dismissed');
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
    <div className="min-h-screen bg-gothic-darkest">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-gothic-dark/95 backdrop-blur-sm border-b border-accent-maroon/30">
        <div className="max-w-4xl mx-auto px-3 md:px-4 py-3">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-text-muted hover:text-primary transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="font-lora">Back</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Chapter Header */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="text-primary font-cinzel">Chapter {chapter.chapter_number}</span>
            {chapter.is_free ? (
              <span className="text-2xl font-bold text-green-600 dark:text-green-400 font-cinzel">
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

                  <iframe
                    src={`${chapter.pdf_url}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`}
                    className="w-full border-0 rounded"
                    style={{ height: '80vh' }}
                    title={chapter.title}
                    onContextMenu={(e) => e.preventDefault()}
                  />

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
                      <span>View-only • No downloads</span>
                    </p>
                  </div>
                </div>
              ) : chapter.content_type === 'text' && chapter.rich_content ? (
                <RichTextViewer 
                  content={chapter.rich_content as any}
                  userEmail={user?.email}
                />
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