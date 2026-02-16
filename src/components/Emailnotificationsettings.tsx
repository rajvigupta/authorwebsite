import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useToast } from './Toast';

export default function EmailNotificationSettings() {
  const { profile } = useAuth();
  const toast = useToast();
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      // @ts-ignore - email_notifications_enabled will be added to Profile type
      setEmailNotificationsEnabled(profile.email_notifications_enabled ?? true);
      setLoading(false);
    }
  }, [profile]);

  const handleToggleNotifications = async () => {
    if (!profile) return;

    setSaving(true);
    try {
      const newValue = !emailNotificationsEnabled;

      const { error } = await supabase
        .from('profiles')
        .update({ email_notifications_enabled: newValue })
        .eq('id', profile.id);

      if (error) throw error;

      setEmailNotificationsEnabled(newValue);
      toast.success(
        newValue 
          ? '✅ Email notifications enabled' 
          : '🔕 Email notifications disabled'
      );

    } catch (error: any) {
      console.error('Error updating notification settings:', error);
      toast.error('Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-parchment-dark border border-gold rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gold bg-opacity-20 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gold bg-opacity-20 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-parchment-dark border border-gold rounded-lg p-6 shadow-lg">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-xl font-cinzel text-gold mb-2">
            📧 Email Notifications
          </h3>
          <p className="text-parchment-light text-sm mb-4 leading-relaxed">
            Receive email notifications when new chapters are published. 
            You'll get updates about the latest content straight to your inbox.
          </p>
          
          <div className="flex items-center gap-3">
            <button
              onClick={handleToggleNotifications}
              disabled={saving}
              className={`
                relative inline-flex h-7 w-14 items-center rounded-full transition-colors duration-300
                ${emailNotificationsEnabled ? 'bg-gold' : 'bg-gray-600'}
                ${saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
              role="switch"
              aria-checked={emailNotificationsEnabled}
            >
              <span
                className={`
                  inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform duration-300
                  ${emailNotificationsEnabled ? 'translate-x-8' : 'translate-x-1'}
                `}
              />
            </button>
            
            <span className="text-parchment font-lora text-sm">
              {saving ? (
                'Saving...'
              ) : emailNotificationsEnabled ? (
                <span className="text-gold font-semibold">Enabled</span>
              ) : (
                <span className="text-gray-500">Disabled</span>
              )}
            </span>
          </div>
        </div>

        <div className="ml-4">
          {emailNotificationsEnabled ? (
            <svg className="w-12 h-12 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          ) : (
            <svg className="w-12 h-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
            </svg>
          )}
        </div>
      </div>

      {/* Additional Info */}
      <div className="mt-6 pt-6 border-t border-gold border-opacity-30">
        <p className="text-xs text-parchment-light">
          ℹ️ <strong>Note:</strong> You can manage your preferences at any time. 
          All notifications include an unsubscribe link.
        </p>
      </div>
    </div>
  );
}