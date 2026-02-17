import { useState, useEffect } from 'react';
import { X, User, Edit2, Save, Bell, BellOff } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './Toast';

type EditNameModalProps = {
  isOpen: boolean;
  onClose: () => void;
  currentName: string;
};

export function EditNameModal({ isOpen, onClose, currentName }: EditNameModalProps) {
  const [newName, setNewName] = useState(currentName);
  const [loading, setLoading] = useState(false);
  const [savingNotif, setSavingNotif] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const { user, profile } = useAuth();
  const toast = useToast();
  const isReader = profile?.role === 'reader';

  // Load current notification preference when modal opens
  useEffect(() => {
    if (profile && isReader) {
      setEmailNotifications((profile as any).email_notifications_enabled ?? true);
    }
  }, [profile, isReader]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newName.trim()) {
      toast.error('Name cannot be empty');
      return;
    }

    if (newName === currentName) {
      toast.info('No changes made');
      onClose();
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: newName.trim() })
        .eq('id', user!.id);

      if (error) throw error;

      toast.success('✅ Name updated successfully!');
      
      // Reload to refresh profile
      window.location.reload();
    } catch (error: any) {
      console.error('Error updating name:', error);
      toast.error(error.message || 'Failed to update name');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleNotifications = async () => {
    if (!user) return;

    setSavingNotif(true);
    const newValue = !emailNotifications;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ email_notifications_enabled: newValue })
        .eq('id', user.id);

      if (error) throw error;

      setEmailNotifications(newValue);
      toast.success(
        newValue
          ? '🔔 Email notifications enabled!'
          : '🔕 Email notifications disabled'
      );
    } catch (error: any) {
      console.error('Error updating notifications:', error);
      toast.error('Failed to update notification preference');
    } finally {
      setSavingNotif(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-forest-mid to-forest-dark rounded-2xl shadow-2xl max-w-md w-full p-8 relative border-2 border-gold/30">
        
        {/* Corner ornaments */}
        <div className="corner-ornament corner-ornament-tl"></div>
        <div className="corner-ornament corner-ornament-tr"></div>
        <div className="corner-ornament corner-ornament-bl"></div>
        <div className="corner-ornament corner-ornament-br"></div>

        {/* Decorative top border */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent opacity-50"></div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-cream hover:text-gold transition-colors z-10"
          aria-label="Close"
        >
          <X size={24} />
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-block p-3 bg-gold/10 rounded-full mb-4 border border-gold/30">
            <Edit2 size={32} className="text-gold" />
          </div>
          
          <h2 className="text-3xl font-bold text-gold-bright mb-2 font-cinzel">
            Edit Your Name
          </h2>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-cream mb-2 font-lora">
              Name
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User size={18} className="text-green-fresh" />
              </div>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border-2 border-green-fresh/30 rounded-lg focus:ring-2 focus:ring-gold focus:border-gold bg-white text-gray-900 placeholder-gray-400 transition-all font-lora"
                placeholder="Enter your name"
                required
                maxLength={100}
                autoFocus
              />
            </div>
          </div>

          {/* Current name display */}
          <div className="bg-forest-light/30 border border-green-fresh/20 rounded-lg p-3">
            <p className="text-xs text-cream-dark font-lora mb-1">Current name:</p>
            <p className="text-sm text-cream font-lora font-semibold">{currentName}</p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading || !newName.trim() || newName === currentName}
              className="flex-1 btn-gold py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-gold font-cinzel text-sm uppercase tracking-wider flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-forest-darkest"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Save Changes
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-6 py-3 border-2 border-green-fresh/30 text-cream rounded-lg hover:bg-forest-light transition-all font-lora disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>

        {/* ✅ EMAIL NOTIFICATIONS TOGGLE - Only for readers */}
        {isReader && (
          <div className="mt-6 pt-6 border-t border-gold/20">
            <div className="flex items-center justify-between">
              {/* Left: Label & Description */}
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${emailNotifications ? 'bg-gold/10 border border-gold/30' : 'bg-gray-700/50 border border-gray-600/30'}`}>
                  {emailNotifications
                    ? <Bell size={18} className="text-gold" />
                    : <BellOff size={18} className="text-gray-400" />
                  }
                </div>
                <div>
                  <p className="text-sm font-cinzel text-cream font-semibold">
                    Email Notifications
                  </p>
                  <p className="text-xs text-cream-dark font-lora mt-0.5">
                    {emailNotifications
                      ? 'Get notified when chapters release'
                      : 'You won\'t receive chapter alerts'
                    }
                  </p>
                </div>
              </div>

              {/* Right: Toggle Switch */}
              <button
                onClick={handleToggleNotifications}
                disabled={savingNotif}
                className={`
                  relative inline-flex h-6 w-12 items-center rounded-full transition-all duration-300
                  ${emailNotifications ? 'bg-gold' : 'bg-gray-600'}
                  ${savingNotif ? 'opacity-50 cursor-wait' : 'cursor-pointer hover:opacity-80'}
                `}
                role="switch"
                aria-checked={emailNotifications}
                title={emailNotifications ? 'Disable email notifications' : 'Enable email notifications'}
              >
                {savingNotif ? (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <div className="animate-spin h-3 w-3 border border-white rounded-full border-t-transparent"></div>
                  </span>
                ) : (
                  <span
                    className={`
                      inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-300
                      ${emailNotifications ? 'translate-x-7' : 'translate-x-1'}
                    `}
                  />
                )}
              </button>
            </div>
          </div>
        )}

      

        {/* Decorative bottom border */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent opacity-50"></div>
      </div>
    </div>
  );
}