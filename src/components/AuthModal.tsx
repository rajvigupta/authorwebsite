import { useState } from 'react';
import { X, Mail, Lock, User, HelpCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
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
  const { signIn, signUp } = useAuth();

  // Don't render anything if both modals are closed
  if (!isOpen && !showForgotPassword) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'signin') {
        await signIn(email, password);
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
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
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
  };

  return (
    <>
      {/*Main Auth Modal - Hide when showing forgot password*/}
      {!showForgotPassword && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-forest-mid to-forest-dark rounded-2xl shadow-2xl max-w-md w-full p-8 relative transform transition-all max-h-[90vh] overflow-y-auto border-2 border-gold/30">
            
            {/* Decorative corner ornaments */}
            <div className="corner-ornament corner-ornament-tl"></div>
            <div className="corner-ornament corner-ornament-tr"></div>
            <div className="corner-ornament corner-ornament-bl"></div>
            <div className="corner-ornament corner-ornament-br"></div>

            {/* Decorative top border glow */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent opacity-50"></div>
            
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-cream hover:text-gold transition-colors z-10"
              aria-label="Close"
            >
              <X size={24} />
            </button>

            <div className="text-center mb-8">
              {/* Decorative icon */}
              <div className="inline-block p-3 bg-gold/10 rounded-full mb-4 border border-gold/30">
                <User size={32} className="text-gold" />
              </div>
              
              <h2 className="text-3xl font-bold text-gold-bright mb-2 font-cinzel">
                {mode === 'signin' ? 'Welcome Back' : 'Join Us'}
              </h2>
              <p className="text-cream-dark text-sm font-cormorant italic">
                {mode === 'signin'
                  ? 'Sign in to access your stories'
                  : 'Begin your journey into captivating tales'}
              </p>
            </div>

            <div className="space-y-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'signup' && (
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
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border-2 border-green-fresh/30 rounded-lg focus:ring-2 focus:ring-gold focus:border-gold bg-forest-light text-black placeholder-cream-dark/50 transition-all font-lora"
                        placeholder="Enter your name"
                        required
                      />
                    </div>
                  </div>
                )}

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
                      className="w-full pl-10 pr-4 py-3 border-2 border-green-fresh/30 rounded-lg focus:ring-2 focus:ring-gold focus:border-gold bg-forest-light text-black placeholder-dark/50 transition-all font-lora"
                      placeholder="you@example.com"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-cream mb-2 font-lora">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock size={18} className="text-green-fresh" />
                    </div>
                    <input
                    type="text"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border-2 border-green-fresh/30 rounded-lg focus:ring-2 focus:ring-gold focus:border-gold bg-forest-light text-black placeholder-cream-dark/50 transition-all font-lora"
                      placeholder="••••••••"
                      required
                      minLength={6}
                    />
                  </div>
                  {mode === 'signup' && (
                    <p className="mt-1 text-xs text-cream-dark font-lora">
                      Must be at least 6 characters
                    </p>
                  )}
                </div>

                {mode === 'signup' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-cream mb-2 font-lora">
                        Security Question
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <HelpCircle size={18} className="text-green-fresh" />
                        </div>
                        <select
                          value={securityQuestion}
                          onChange={(e) => setSecurityQuestion(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 border-2 border-green-fresh/30 rounded-lg focus:ring-2 focus:ring-gold focus:border-gold bg-forest-light text-black transition-all appearance-none font-lora"
                          required
                        >
                          {SECURITY_QUESTIONS.map((question) => (
                            <option key={question} value={question} className="bg-forest-mid">
                              {question}
                            </option>
                          ))}
                        </select>
                      </div>
                      <p className="mt-1 text-xs text-cream-dark font-lora">
                        Used for password recovery
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-cream mb-2 font-lora">
                        Your Answer
                      </label>
                      <input
                        type="text"
                        value={securityAnswer}
                        onChange={(e) => setSecurityAnswer(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-green-fresh/30 rounded-lg text-black placeholder-cream-dark/50 transition-all font-lora"
                        placeholder="Enter your answer"
                        required
                      />
                      <p className="mt-1 text-xs text-cream-dark font-lora italic">
                        Remember this - you'll need it to reset your password
                      </p>
                    </div>
                  </>
                )}

                {error && (
                  <div className="bg-red-900/30 border-2 border-red-500/50 text-red-200 text-sm p-3 rounded-lg flex items-start gap-2 font-lora">
                    <span className="font-semibold">Error:</span>
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full btn-gold py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-gold font-cinzel text-sm uppercase tracking-wider"
                >
                  {loading
                    ? 'Please wait...'
                    : mode === 'signin'
                    ? 'Sign In'
                    : 'Create Account'}
                </button>
              </form>

              {mode === 'signin' && (
                <div className="text-center">
                  <button
                    onClick={() => setShowForgotPassword(true)}
                    className="text-gold hover:text-gold-bright text-sm font-medium transition-colors font-lora"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

             {/* Ornamental divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-green-fresh/30"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-3 bg-forest-dark text-cream-dark font-lora">or</span>
                </div>
              </div>

              <div className="text-center">
                <button
                  onClick={handleModeSwitch}
                  className="text-gold hover:text-gold-bright text-sm font-medium transition-colors font-lora"
                >
                  {mode === 'signin'
                    ? "Don't have an account? Sign up"
                    : 'Already have an account? Sign in'}
                </button>
              </div>
            </div>

            {/* Decorative bottom border glow */}
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent opacity-50"></div>
          </div>
        </div>
      )}

      {/* Forgot Password Modal - Show when triggered */}
      {showForgotPassword && (
        <ForgotPasswordModal
          isOpen={showForgotPassword}
          onClose={() => setShowForgotPassword(false)}
        />
      )}
    </>
  );
}