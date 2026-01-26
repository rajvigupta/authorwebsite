import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './components/Toast'; // ✅ NEW
import { Header } from './components/Header';
import { Footer } from './components/footer';
import { ChapterStore } from './components/ChapterStore';
import { AuthorDashboard } from './components/AuthorDashboard';
import { BookView } from './components/BookViewer';
import { StandaloneChapterView } from './components/chapterviewe';
import { AuthModal } from './components/AuthModal';
import { FloatingPages } from './components/FloatingPages';

function AppContent() {
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

  return (
    <div className="min-h-screen bg-gothic-darkest flex flex-col">
      <FloatingPages />
      
      <Header onAuthClick={() => setShowAuthModal(true)} />

      <main className="flex-1">
        <Routes>
          <Route path="/" element={<ChapterStore />} />
          <Route path="/book/:bookId" element={<BookView />} />
          <Route path="/chapter/:chapterId" element={<StandaloneChapterView />} />
          <Route 
            path="/dashboard" 
            element={isAuthor ? <AuthorDashboard /> : <Navigate to="/" replace />} 
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <Footer />
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ToastProvider> {/* ✅ NEW - Wrap everything */}
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;