import { useState, useEffect } from 'react';
import { X, Mail, Lock, User, HelpCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.tsx';
import { useToast } from './Toast';
import { ForgotPasswordModal } from './ForgotPasswordModal.tsx';
 

type AuthModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const SECURITY_QUESTIONS = [
  "What was the name of your first pet?",
  "What is your mother's maiden name?",
  "What city were you born in?",
];

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState(SECURITY_QUESTIONS[0]);
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { signIn, signUp } = useAuth();
  const toast = useToast();

  useEffect(() => {
     if (isOpen) {
       setMode('signin');
       setEmail('');
       setPassword('');
       setFullName('');
       setSecurityQuestion(SECURITY_QUESTIONS[0]);
       setSecurityAnswer('');
       setError('');
       setShowForgotPassword(false);
     }
   }, [isOpen, User]);

  if (!isOpen && !showForgotPassword) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'signin') {
        await signIn(email, password);
        toast.success('Welcome back! 🎉', 4000);
        onClose();
      } else {
        if (!fullName.trim()) {
          setError('Please enter your full name');
          setLoading(false);
          return;
        }
        if (!securityAnswer.trim()) {
          setError('Please provide an answer to the security question');
          setLoading(false);
          return;
        }

        await signUp(email, password, fullName, securityQuestion, securityAnswer);
        toast.success('🎊 Account created! Check your email to verify.', 8000);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      toast.error(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleModeSwitch = () => {
    setMode(mode === 'signin' ? 'signup' : 'signin');
    setError('');
    setEmail('');
    setPassword('');
    setFullName('');
    setSecurityQuestion(SECURITY_QUESTIONS[0]);
    setSecurityAnswer('');
    setShowPassword(false);
  };

  const inputClass =
    'w-full pl-10 pr-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-green-fresh/30 rounded-lg ' +
    'focus:ring-2 focus:ring-gold focus:border-gold ' +
    'bg-white text-gray-900 placeholder-cream-dark/70 ' +
    'transition-all font-lora';

  const iconClass = 'text-forest-dark/70';

  return (
    <>
      {!showForgotPassword && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-forest-mid to-forest-dark rounded-2xl shadow-2xl max-w-md w-full p-4 sm:p-8 relative border-2 border-gold/30 max-h-[95vh] overflow-y-auto">

            <button
              onClick={onClose}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 text-cream hover:text-gold z-10"
            >
              <X size={20} className="sm:w-6 sm:h-6" />
            </button>

            <div className="text-center mb-4 sm:mb-8">
              <div className="inline-block p-2 sm:p-3 bg-gold/10 rounded-full mb-3 sm:mb-4 border border-gold/30">
                <User size={24} className="sm:w-8 sm:h-8 text-gold" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gold-bright font-cinzel">
                {mode === 'signin' ? 'Welcome Back' : 'Join Us'}
              </h2>
              <p className="text-cream-dark text-xs sm:text-sm font-cormorant italic mt-1">
                {mode === 'signin'
                  ? 'Sign in to access your stories'
                  : 'Begin your journey into captivating tales'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">

              {mode === 'signup' && (
                <div>
                  <label className="block text-xs sm:text-sm text-cream mb-1.5 sm:mb-2 font-lora">Name</label>
                  <div className="relative">
                    <User size={16} className={`sm:w-[18px] sm:h-[18px] absolute left-3 top-1/2 -translate-y-1/2 ${iconClass}`} />
                    <input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className={inputClass}
                      placeholder="Enter your name"
                      required
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs sm:text-sm text-cream mb-1.5 sm:mb-2 font-lora">Email Address</label>
                <div className="relative">
                  <Mail size={16} className={`sm:w-[18px] sm:h-[18px] absolute left-3 top-1/2 -translate-y-1/2 ${iconClass}`} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                    placeholder="you@example.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm text-cream mb-1.5 sm:mb-2 font-lora">Password</label>
                <div className="relative">
                  <Lock size={16} className={`sm:w-[18px] sm:h-[18px] absolute left-3 top-1/2 -translate-y-1/2 ${iconClass}`} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`${inputClass} pr-12`}
                    placeholder="Enter password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-forest-dark/70 hover:text-gold"
                  >
                    {showPassword ? <EyeOff size={16} className="sm:w-[18px] sm:h-[18px]" /> : <Eye size={16} className="sm:w-[18px] sm:h-[18px]" />}
                  </button>
                </div>
              </div>

              {mode === 'signup' && (
                <>
                  <div>
                    <label className="block text-xs sm:text-sm text-cream mb-1.5 sm:mb-2 font-lora">Security Question</label>
                    <div className="relative">
                      <HelpCircle size={16} className={`sm:w-[18px] sm:h-[18px] absolute left-3 top-1/2 -translate-y-1/2 ${iconClass}`} />
                      <select
                        value={securityQuestion}
                        onChange={(e) => setSecurityQuestion(e.target.value)}
                        className={`${inputClass} appearance-none`}
                        required
                      >
                        {SECURITY_QUESTIONS.map(q => (
                          <option key={q}>{q}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm text-cream mb-1.5 sm:mb-2 font-lora">Your Answer</label>
                    <input
                      value={securityAnswer}
                      onChange={(e) => setSecurityAnswer(e.target.value)}
                      className="w-full px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-green-fresh/30 rounded-lg bg-white text-gray-900 placeholder-cream-dark/70 font-lora"
                      placeholder="Enter your answer"
                      required
                    />
                  </div>
                </>
              )}

              {error && (
                <div className="bg-red-900/30 border border-red-500/50 text-red-200 text-xs sm:text-sm p-2.5 sm:p-3 rounded">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-gold py-2.5 sm:py-3 rounded-lg font-cinzel uppercase tracking-wider hover:brightness-110 text-sm sm:text-base"
              >
                {loading ? 'Please wait…' : mode === 'signin' ? 'Sign In' : 'Create Account'}
              </button>
            </form>

            {mode === 'signin' && (
              <div className="text-center mt-3 sm:mt-4">
                <button
                  onClick={() => setShowForgotPassword(true)}
                  className="text-gold hover:text-gold-bright text-xs sm:text-sm font-lora"
                >
                  Forgot password?
                </button>
              </div>
            )}

            {/* OR divider */}
            <div className="relative my-4 sm:my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-green-fresh/40" />
              </div>
              <div className="relative flex justify-center">
                <span className="px-3 bg-forest-dark text-cream-dark text-xs font-lora">or</span>
              </div>
            </div>

            <div className="text-center">
              <button
                onClick={handleModeSwitch}
                className="text-gold hover:text-gold-bright text-xs sm:text-sm font-lora"
              >
                {mode === 'signin'
                  ? "Don't have an account? Sign up"
                  : 'Already have an account? Sign in'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showForgotPassword && (
        <ForgotPasswordModal
          isOpen={showForgotPassword}
          onClose={() => setShowForgotPassword(false)}
        />
      )}
    </>
  );
}