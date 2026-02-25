import { useState } from 'react';
import { Share2, X, Copy, Check } from 'lucide-react';

interface ShareButtonProps {
  bookTitle: string;
  bookId: string;
  coverImageUrl?: string | null;
  description?: string | null;
}

export function ShareButton({ bookTitle, bookId, coverImageUrl, description }: ShareButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [copied, setCopied] = useState(false);

  // Safe fallbacks for null values
  const safeCoverImage = coverImageUrl || '';
  const safeDescription = description || '';

  const shareUrl = `${window.location.origin}/book/${bookId}`;
  const shareText = `Check out "${bookTitle}" on MemoryCraver!`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: bookTitle,
          text: shareText,
          url: shareUrl,
        });
        setShowModal(false);
      } catch (error) {
        console.log('Share cancelled');
      }
    }
  };

  const shareOptions = [
    {
      name: 'Facebook',
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      ),
      color: 'from-blue-600 to-blue-700',
      action: () => {
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank');
      }
    },
    {
      name: 'Twitter',
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      ),
      color: 'from-black to-gray-800',
      action: () => {
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`, '_blank');
      }
    },
    {
      name: 'WhatsApp',
      icon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      ),
      color: 'from-green-500 to-green-600',
      action: () => {
        window.open(`https://wa.me/?text=${encodeURIComponent(shareText + '\n' + shareUrl)}`, '_blank');
      }
    },
    {
      name: 'Email',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      color: 'from-gray-600 to-gray-700',
      action: () => {
        const emailBody = safeDescription ? `${safeDescription}\n\n${shareUrl}` : shareUrl;
        window.location.href = `mailto:?subject=${encodeURIComponent(shareText)}&body=${encodeURIComponent(emailBody)}`;
      }
    },
  ];

  return (
    <>
      {/* Share Button */}
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-lg transition-all group"
        title="Share this book"
      >
        <Share2 size={16} className="text-primary group-hover:scale-110 transition-transform" />
        <span className="text-sm font-lora text-primary">Share</span>
      </button>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          />

          {/* Modal Content */}
          <div className="relative w-full max-w-lg mx-4 mb-4 sm:mb-0 bg-gradient-to-br from-gothic-mid to-gothic-dark rounded-2xl shadow-2xl border-2 border-primary/30 overflow-hidden animate-slide-up">
            
            {/* Decorative top border */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent"></div>
            
            {/* Close button */}
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-gothic-dark/50 hover:bg-gothic-dark transition-colors z-10"
            >
              <X size={20} className="text-text-muted hover:text-primary transition-colors" />
            </button>

            {/* Book Preview */}
            <div className="relative p-8 pb-6 text-center">
              {/* Book Cover */}
              {safeCoverImage ? (
                <div className="inline-block mb-4">
                  <div className="relative">
                    <img
                      src={safeCoverImage}
                      alt={bookTitle}
                      className="w-32 h-48 object-cover rounded-lg shadow-2xl border-2 border-primary/30"
                    />
                    <div className="absolute -bottom-2 -right-2 bg-gradient-to-br from-primary to-gold-dark p-2 rounded-full shadow-lg">
                      <Share2 size={16} className="text-gothic-darkest" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="inline-flex items-center justify-center w-32 h-48 bg-gothic-dark rounded-lg border-2 border-primary/30 mb-4">
                  <Share2 size={32} className="text-primary" />
                </div>
              )}

              <h2 className="text-xl font-cinzel font-bold text-primary mb-2">
                Share
              </h2>
              <p className="text-sm text-text-muted font-lora">
                Share an update on your socials with link so that your fans can discover this story.
              </p>
            </div>

            {/* Copy Link Section */}
            <div className="px-6 pb-4">
              <button
                onClick={handleCopyLink}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-gothic-dark hover:bg-gothic-darkest border border-primary/20 hover:border-primary/40 rounded-xl transition-all group"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                    {copied ? (
                      <Check size={18} className="text-green-500" />
                    ) : (
                      <Copy size={18} className="text-primary" />
                    )}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-xs text-text-muted font-lora truncate">
                      {shareUrl}
                    </p>
                  </div>
                </div>
                <span className={`text-sm font-cinzel transition-colors ${copied ? 'text-green-500' : 'text-primary'}`}>
                  {copied ? 'Copied!' : 'Copy'}
                </span>
              </button>
            </div>

            {/* Share Options Grid */}
            <div className="px-6 pb-6">
              <div className="grid grid-cols-4 gap-3">
                {shareOptions.map((option) => (
                  <button
                    key={option.name}
                    onClick={() => {
                      option.action();
                      setShowModal(false);
                    }}
                    className="group"
                  >
                    <div className={`p-4 bg-gradient-to-br ${option.color} rounded-2xl shadow-lg hover:scale-110 hover:shadow-2xl transition-all duration-300 flex items-center justify-center mb-2`}>
                      <div className="text-white">
                        {option.icon}
                      </div>
                    </div>
                    <p className="text-xs font-lora text-text-muted group-hover:text-primary transition-colors text-center">
                      {option.name}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Native Share Button (Mobile) */}
            
              <div className="px-6 pb-6">
                <button
                  onClick={handleNativeShare}
                  className="w-full py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition"
                >
                  More Options
                </button>
              </div>
            

            {/* Decorative bottom border */}
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent"></div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </>
  );
}