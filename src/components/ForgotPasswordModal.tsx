import { useState } from 'react';
import { X, Mail, Lock, HelpCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './Toast';

type ForgotPasswordModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function ForgotPasswordModal({ isOpen, onClose }: ForgotPasswordModalProps) {
  const [step, setStep] = useState<'email' | 'question' | 'reset'>('email');
  const [email, setEmail] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { getSecurityQuestion, verifySecurityAnswer, resetPassword } = useAuth();
  const toast = useToast();

  if (!isOpen) return null;

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const question = await getSecurityQuestion(email);
      if (!question) {
        setError('No account found with this email or security question not set');
        toast.error('No account found with this email');
        setLoading(false);
        return;
      }
      setSecurityQuestion(question);
      setStep('question');
      toast.info('Security question loaded. Please answer it to continue.');
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve security question');
      toast.error(err.message || 'Failed to retrieve security question');
    } finally {
      setLoading(false);
    }
  };

  const handleQuestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const isValid = await verifySecurityAnswer(email, securityAnswer);
      if (!isValid) {
        setError('Incorrect answer. Please try again.');
        toast.error('Incorrect security answer. Please try again.');
        setLoading(false);
        return;
      }
      setStep('reset');
      toast.success('✅ Security answer verified! You can now reset your password.');
    } catch (err: any) {
      setError(err.message || 'Failed to verify answer');
      toast.error(err.message || 'Failed to verify answer');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      toast.error('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      await resetPassword(email, securityAnswer, newPassword);
      toast.success('🎉 Password reset successful! You can now sign in with your new password.', 8000);
      toast.info('Please sign in using your new password.', 6000);
      handleClose();
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
      toast.error(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep('email');
    setEmail('');
    setSecurityQuestion('');
    setSecurityAnswer('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-forest-mid to-forest-dark rounded-2xl shadow-2xl max-w-md w-full p-8 relative border-2 border-gold/30">
        
        <div className="corner-ornament corner-ornament-tl"></div>
        <div className="corner-ornament corner-ornament-tr"></div>
        <div className="corner-ornament corner-ornament-bl"></div>
        <div className="corner-ornament corner-ornament-br"></div>

        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent opacity-50"></div>

        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-cream hover:text-gold transition-colors"
          aria-label="Close"
        >
          <X size={24} />
        </button>

        <div className="text-center mb-6">
          <div className="inline-block p-3 bg-gold/10 rounded-full mb-4 border border-gold/30">
            <Lock size={32} className="text-gold" />
          </div>
          
          <h2 className="text-3xl font-bold text-gold-bright mb-2 font-cinzel">
            Reset Password
          </h2>
          <p className="text-cream-dark text-sm font-cormorant italic">
            {step === 'email' && 'Enter your email to begin'}
            {step === 'question' && 'Answer your security question'}
            {step === 'reset' && 'Choose a new password'}
          </p>
        </div>

        {step === 'email' && (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-cream mb-2 font-lora">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail size={18} className="text-green-fresh" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border-2 border-green-fresh/30 rounded-lg focus:ring-2 focus:ring-gold focus:border-gold bg-forest-light text-black placeholder-black transition-all font-lora"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-900/30 border-2 border-red-500/50 text-red-200 text-sm p-3 rounded-lg font-lora">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-gold py-3 rounded-lg font-semibold disabled:opacity-50 transition-all font-cinzel text-sm uppercase tracking-wider"
            >
              {loading ? 'Please wait...' : 'Continue'}
            </button>
          </form>
        )}

        {step === 'question' && (
          <form onSubmit={handleQuestionSubmit} className="space-y-4">
            <div className="bg-green-fresh/10 border-2 border-green-fresh/30 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-2">
                <HelpCircle size={20} className="text-gold mt-0.5 flex-shrink-0" />
                <p className="text-sm text-cream font-lora font-medium">
                  {securityQuestion}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-cream mb-2 font-lora">
                Your Answer
              </label>
              <input
                type="text"
                value={securityAnswer}
                onChange={(e) => setSecurityAnswer(e.target.value)}
                className="w-full px-4 py-3 border-2 border-green-fresh/30 rounded-lg focus:ring-2 focus:ring-gold focus:border-gold bg-forest-light text-black placeholder-cream-dark/50 transition-all font-lora"
                placeholder="Enter your answer"
                required
              />
              <p className="mt-1 text-xs text-cream-dark font-lora">
                Answer is not case-sensitive
              </p>
            </div>

            {error && (
              <div className="bg-red-900/30 border-2 border-red-500/50 text-red-200 text-sm p-3 rounded-lg font-lora">
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep('email')}
                className="flex-1 px-4 py-3 border-2 border-green-fresh/30 text-cream rounded-lg hover:bg-forest-light transition-all font-lora"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 btn-gold py-3 rounded-lg font-semibold disabled:opacity-50 transition-all font-cinzel text-sm uppercase tracking-wider"
              >
                {loading ? 'Verifying...' : 'Verify'}
              </button>
            </div>
          </form>
        )}

        {step === 'reset' && (
          <form onSubmit={handlePasswordReset} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-cream mb-2 font-lora">
                New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock size={18} className="text-green-fresh" />
                </div>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border-2 border-green-fresh/30 rounded-lg focus:ring-2 focus:ring-gold focus:border-gold bg-forest-light text-black placeholder-cream-dark/50 transition-all font-lora"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-cream mb-2 font-lora">
                Confirm New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock size={18} className="text-green-fresh" />
                </div>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border-2 border-green-fresh/30 rounded-lg focus:ring-2 focus:ring-gold focus:border-gold bg-forest-light text-black placeholder-cream-dark/50 transition-all font-lora"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
              <p className="mt-1 text-xs text-cream-dark font-lora">
                Must be at least 6 characters
              </p>
            </div>

            {error && (
              <div className="bg-red-900/30 border-2 border-red-500/50 text-red-200 text-sm p-3 rounded-lg font-lora">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-gold py-3 rounded-lg font-semibold disabled:opacity-50 transition-all font-cinzel text-sm uppercase tracking-wider"
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        )}

        <div className="mt-6 text-center">
          <button
            onClick={handleClose}
            className="text-gold hover:text-gold-bright text-sm transition-colors font-lora"
          >
            ← Back to Sign In
          </button>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent opacity-50"></div>
      </div>
    </div>
  );
}