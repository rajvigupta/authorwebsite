import { BookOpen, User, LogOut, LayoutDashboard, Home } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

type HeaderProps = {
  showDashboard: boolean;
  onToggleDashboard: () => void;
  onAuthClick: () => void;
};

export function Header({ showDashboard, onToggleDashboard, onAuthClick }: HeaderProps) {
  const { user, profile, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const isAuthor = profile?.role === 'author' ;

  return (
    <header className="relative bg-gothic-dark border-b-2 border-accent-maroon/30 sticky top-0 z-40 backdrop-blur-sm">
      {/* Ornamental top border */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50"></div>
      
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-primary/10 rounded-lg border border-primary/30">
              <BookOpen className="text-primary" size={32} />
            </div>
            <div>
              <h1 className="text-2xl font-cinzel font-bold text-primary tracking-wide">
                memorycraver
              </h1>
              <p className="text-sm font-cormorant italic text-text-muted">
              tales written in time 
              </p>
            </div>
          </div>

          <nav className="flex items-center gap-6">
            {/* Navigation for Author */}
            {isAuthor && (
              <button
                onClick={onToggleDashboard}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-cinzel text-sm transition-all border border-accent-maroon/30 hover:border-primary hover:bg-primary/5"
              >
                {showDashboard ? (
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

            {/* User Section */}
            {user ? (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-4 py-2 bg-gothic-mid rounded-lg border border-accent-maroon/30">
                  <User size={16} className="text-primary" />
                  <span className="text-sm font-lora text-text-light">
                    {profile?.full_name}
                  </span>
                  {isAuthor && (
                    <span className="ml-2 px-2 py-0.5 bg-accent-maroon text-primary text-xs rounded-full font-cinzel">
                      Author
                    </span>
                  )}
                </div>
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
        </div>
      </div>

      {/* Ornamental bottom border */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent-maroon to-transparent opacity-30"></div>
    </header>
  );
}