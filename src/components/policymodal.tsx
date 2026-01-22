import { X } from 'lucide-react';

type PolicyModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
};

export function PolicyModal({ isOpen, onClose, title, children }: PolicyModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-forest-mid to-forest-dark rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden border-2 border-gold/30 relative">
        
        {/* Decorative corner ornaments */}
        <div className="corner-ornament corner-ornament-tl"></div>
        <div className="corner-ornament corner-ornament-tr"></div>
        <div className="corner-ornament corner-ornament-bl"></div>
        <div className="corner-ornament corner-ornament-br"></div>

        {/* Decorative top border glow */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent opacity-50"></div>
        
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-br from-forest-mid to-forest-dark border-b border-gold/20 px-8 py-6 z-10">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-cream hover:text-gold transition-colors"
            aria-label="Close"
          >
            <X size={24} />
          </button>
          
          <h2 className="text-3xl font-bold text-gold-bright font-cinzel pr-8">
            {title}
          </h2>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto max-h-[calc(85vh-100px)] px-8 py-6">
          <div className="prose prose-sm max-w-none text-cream font-lora">
            {children}
          </div>
        </div>

        {/* Decorative bottom border glow */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent opacity-50"></div>
      </div>
    </div>
  );
}