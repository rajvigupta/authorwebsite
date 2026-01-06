import { useState, useEffect } from 'react';
import { ArrowLeft, Lock, ShoppingCart, Download } from 'lucide-react';
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

export function StandaloneChapterView({ chapterId, onBack }: StandaloneChapterViewProps) {
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const { user, profile } = useAuth();

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

  const handlePurchase = async () => {
    if (!user || !chapter) {
      alert('Please sign in to purchase');
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
              await loadChapterData();
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gothic-darkest flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!chapter) return null;

  const purchased = isPurchased();

  return (
    <div className="min-h-screen bg-gothic-darkest">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-gothic-dark/95 backdrop-blur-sm border-b border-accent-maroon/30">
        <div className="max-w-4xl mx-auto px-4 py-3">
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
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Chapter Header */}
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

        {/* Purchase / Content Section */}
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
            {/* Chapter Content */}
            <div className="bg-gothic-mid rounded-lg p-8 mb-8 border border-accent-maroon/20 shadow-gothic">
              {chapter.content_type === 'pdf' && chapter.pdf_url ? (
                <div className="text-center py-12">
                  <p className="text-text-light mb-4 font-lora">
                    This chapter is available as a PDF download.
                  </p>
                  <a
                    href={chapter.pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-gold px-6 py-3 rounded-lg font-cinzel inline-flex items-center gap-2"
                  >
                    <Download size={20} />
                    Download Chapter PDF
                  </a>
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