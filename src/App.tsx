import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Header } from './components/Header';
import { Footer } from './components/footer';
import { ChapterStore } from './components/ChapterStore';
import { AuthorDashboard } from './components/AuthorDashboard';
import { AuthModal } from './components/AuthModal';

function AppContent() {
  const [showDashboard, setShowDashboard] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { loading, profile } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gothic-darkest flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-text-muted font-lora">Loading...</p>
        </div>
      </div>
    );
  }

  const isAuthor = profile?.role === 'author';
  const shouldShowDashboard = showDashboard && isAuthor;

  return (
    <div className="min-h-screen bg-gothic-darkest flex flex-col">
      <Header
        showDashboard={shouldShowDashboard}
        onToggleDashboard={() => setShowDashboard(!showDashboard)}
        onAuthClick={() => setShowAuthModal(true)}
      />

      <main className="flex-1">
        {shouldShowDashboard ? <AuthorDashboard /> : <ChapterStore />}
      </main>

      <Footer />

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  );

}
function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;

//import { ThemeProvider } from './contexts/ThemeContext.tsx';

