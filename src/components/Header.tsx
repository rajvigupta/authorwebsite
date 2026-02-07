import { BookOpen, User, LogOut, LayoutDashboard, Home, Menu, X, Edit2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { EditNameModal } from './Editnamemodal';

type HeaderProps = {
  onAuthClick: () => void;
};

export function Header({ onAuthClick }: HeaderProps) {
  const { user, profile, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showEditName, setShowEditName] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    try {
      await signOut();
      setMobileMenuOpen(false);
      navigate('/');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const isAuthor = profile?.role === 'author';
  const isDashboard = location.pathname.startsWith('/dashboard');

  const handleToggleDashboard = () => {
    if (isDashboard) {
      navigate('/');
    } else {
      navigate('/dashboard');
    }
    setMobileMenuOpen(false);
  };

  return (
    <>
    <header className="relative bg-gothic-dark border-b-2 border-accent-maroon/30 sticky top-0 z-40 backdrop-blur-sm">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50"></div>
      
      <div className="max-w-7xl mx-auto px-4 py-3 md:py-4">
        <div className="flex items-center justify-between">
          {/* Logo - Clickable to home */}
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-2 md:gap-4 hover:opacity-80 transition-opacity"
          >
            <div className="p-1.5 md:p-2 bg-primary/10 rounded-lg border border-primary/30">
              <BookOpen className="text-primary" size={24} />
            </div>
            <div>
              <h1 className="text-lg md:text-3xl font-cormorant font-bold text-primary tracking-wide">
                memorycraver
              </h1>
            </div>
          </button>

          {/* Desktop Navigation - Hidden on mobile */}
          <nav className="hidden md:flex items-center gap-6">
            {isAuthor && (
              <button
                onClick={handleToggleDashboard}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-cinzel text-sm transition-all border border-accent-maroon/30 hover:border-primary hover:bg-primary/5"
              >
                {isDashboard ? (
                  <>
                    <Home size={18} className="text-primary" />
                    <span className="text-primary">Store</span>
                  </>
                ) : (
                  <>
                    <LayoutDashboard size={18} className="text-text-muted" />
                    <span className="text-text-muted">Dashboard</span>
                  </>
                )}
              </button>
            )}

            {user ? (
              <div className="flex items-center gap-4">
                {/* Editable Name Section */}
                <button
                  onClick={() => setShowEditName(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-gothic-mid rounded-lg border border-accent-maroon/30 hover:border-primary/50 hover:bg-primary/5 transition-all group"
                  title="Click to edit your name"
                >
                  <User size={16} className="text-primary" />
                  <span className="text-sm font-lora text-text-light group-hover:text-primary transition-colors">
                    {profile?.full_name}
                  </span>
                  {isAuthor && (
                    <span className="ml-2 px-2 py-0.5 bg-accent-maroon text-primary text-xs rounded-full font-cinzel">
                      Author
                    </span>
                  )}
                  <Edit2 size={14} className="text-primary/50 group-hover:text-primary transition-colors ml-1" />
                </button>
                
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2 px-4 py-2 text-text-muted hover:text-accent-maroon-light hover:bg-accent-maroon/10 rounded-lg transition-all border border-transparent hover:border-accent-maroon/30"
                >
                  <LogOut size={16} />
                  <span className="text-sm font-lora">Sign Out</span>
                </button>
              </div>
            ) : (
              <button
                onClick={onAuthClick}
                className="btn-gold px-6 py-2 rounded-lg font-semibold transition-all"
              >
                Sign In
              </button>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-primary hover:bg-primary/10 rounded-lg transition-all"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu - Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-4 pb-4 space-y-3 border-t border-accent-maroon/30 pt-4">
            {user ? (
              <>
                {/* Editable Name - Mobile */}
                <button
                  onClick={() => {
                    setShowEditName(true);
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-gothic-mid rounded-lg border border-accent-maroon/30 hover:border-primary/50 hover:bg-primary/5 transition-all group"
                >
                  <div className="flex items-center gap-2">
                    <User size={16} className="text-primary" />
                    <span className="text-sm font-lora text-text-light group-hover:text-primary transition-colors">
                      {profile?.full_name}
                    </span>
                    {isAuthor && (
                      <span className="ml-auto px-2 py-0.5 bg-accent-maroon text-primary text-xs rounded-full font-cinzel">
                        Author
                      </span>
                    )}
                  </div>
                  <Edit2 size={14} className="text-primary/50 group-hover:text-primary transition-colors" />
                </button>

                {isAuthor && (
                  <button
                    onClick={handleToggleDashboard}
                    className="w-full flex items-center gap-2 px-4 py-3 rounded-lg font-cinzel text-sm transition-all border border-accent-maroon/30 hover:border-primary hover:bg-primary/5"
                  >
                    {isDashboard ? (
                      <>
                        <Home size={18} className="text-primary" />
                        <span className="text-primary">Store</span>
                      </>
                    ) : (
                      <>
                        <LayoutDashboard size={18} className="text-text-muted" />
                        <span className="text-text-muted">Dashboard</span>
                      </>
                    )}
                  </button>
                )}

                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2 px-4 py-3 text-text-muted hover:text-accent-maroon-light hover:bg-accent-maroon/10 rounded-lg transition-all border border-transparent hover:border-accent-maroon/30"
                >
                  <LogOut size={16} />
                  <span className="text-sm font-lora">Sign Out</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  onAuthClick();
                  setMobileMenuOpen(false);
                }}
                className="w-full btn-gold px-6 py-3 rounded-lg font-semibold transition-all"
              >
                Sign In
              </button>
            )}
          </div>
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent-maroon to-transparent opacity-30"></div>

</header>

{user && profile && (
  <EditNameModal
    isOpen={showEditName}
    onClose={() => setShowEditName(false)}
    currentName={profile!.full_name}
  />
)}

</>
);

    
}