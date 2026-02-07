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

  const inputClass =
    'w-full pl-10 pr-4 py-3 border-2 border-green-fresh/30 rounded-lg ' +
    'focus:ring-2 focus:ring-gold focus:border-gold ' +
    'bg-white text-gray-900 placeholder-cream-dark/70 font-lora';

  const iconClass = 'text-forest-dark/70';

  const handleClose = () => {
    setStep('email');
    setEmail('');
    setSecurityAnswer('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-forest-mid to-forest-dark rounded-2xl shadow-2xl max-w-md w-full p-8 relative border-2 border-gold/30">

        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-cream hover:text-gold"
        >
          <X size={24} />
        </button>

        <div className="text-center mb-8">
          <div className="inline-block p-3 bg-gold/10 rounded-full mb-4 border border-gold/30">
            <Lock size={32} className="text-gold" />
          </div>
          <h2 className="text-3xl font-bold text-gold-bright font-cinzel">
            Reset Password
          </h2>
          <p className="text-cream-dark text-sm font-cormorant italic mt-1">
            {step === 'email' && 'Enter your email to begin'}
            {step === 'question' && 'Answer your security question'}
            {step === 'reset' && 'Choose a new password'}
          </p>
        </div>

        {step === 'email' && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setLoading(true);
              const q = await getSecurityQuestion(email);
              if (!q) {
                setError('No account found');
                setLoading(false);
                return;
              }
              setSecurityQuestion(q);
              setStep('question');
              setLoading(false);
            }}
            className="space-y-4"
          >
            <div className="relative">
              <Mail size={18} className={`absolute left-3 top-1/2 -translate-y-1/2 ${iconClass}`} />
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                placeholder="you@example.com"
              />
            </div>

            {error && <div className="text-red-300 text-sm">{error}</div>}

            <button className="w-full btn-gold py-3 rounded-lg font-cinzel">
              Continue
            </button>
          </form>
        )}

        {step === 'question' && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const ok = await verifySecurityAnswer(email, securityAnswer);
              if (!ok) {
                setError('Incorrect answer');
                return;
              }
              setStep('reset');
            }}
            className="space-y-4"
          >
            <div className="bg-green-fresh/10 border border-green-fresh/30 p-4 rounded-lg text-cream">
              <HelpCircle size={18} className="inline mr-2 text-gold" />
              {securityQuestion}
            </div>

            <input
              value={securityAnswer}
              onChange={(e) => setSecurityAnswer(e.target.value)}
              className="w-full px-4 py-3 border-2 border-green-fresh/30 rounded-lg bg-white text-gray-900 placeholder-cream-dark/70"
              placeholder="Enter your answer"
            />

            <button className="w-full btn-gold py-3 rounded-lg font-cinzel">
              Verify
            </button>
          </form>
        )}

        {step === 'reset' && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (newPassword !== confirmPassword) {
                setError('Passwords do not match');
                return;
              }
              await resetPassword(email, securityAnswer, newPassword);
              toast.success('Password reset successful');
              handleClose();
            }}
            className="space-y-4"
          >
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={inputClass}
              placeholder="New password"
            />

            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={inputClass}
              placeholder="Confirm password"
            />

            <button className="w-full btn-gold py-3 rounded-lg font-cinzel">
              Reset Password
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
