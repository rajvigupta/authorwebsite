import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { BookManager } from './BookManager';
import { BookChapterManager } from './BookChapterManager';
import { AuthorProfileSection } from './AuthorProfileSection';
import { ChapterManagement } from './ChapterManagement';
import { SalesDashboard } from './SalesDashboard';
import { ReaderManagement } from './ReaderManagement';
import { Book, FileText, User, IndianRupee, Users } from 'lucide-react';

type Tab = 'profile' | 'books' | 'chapters' | 'sales' | 'readers';

export function AuthorDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [managingBookId, setManagingBookId] = useState<string | null>(null);
  const [managingBookTitle, setManagingBookTitle] = useState<string>('');
  const { profile, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">
          Please log in to access the dashboard.
        </p>
      </div>
    );
  }

  if (profile?.role !== 'author') {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">
          You don't have permission to access this page.
        </p>
      </div>
    );
  }

  const handleManageChapters = (bookId: string, bookTitle: string) => {
    setManagingBookId(bookId);
    setManagingBookTitle(bookTitle);
  };

  const handleBackToBooks = () => {
    setManagingBookId(null);
    setManagingBookTitle('');
  };
  
  return (
    <div className="max-w-7xl mx-auto px-3 md:px-4 py-4 md:py-8">
      <h1 className="text-2xl md:text-3xl font-bold text-white mb-4 md:mb-8 font-cinzel">
        Author Dashboard
      </h1>

      <div className="bg-gray-800 rounded-lg shadow-md mb-6">
        {/* MOBILE: Horizontal Scroll Tabs */}
        <div className="border-b border-gray-700 overflow-x-auto">
          <nav className="flex min-w-max md:min-w-0">
            <button
              onClick={() => {
                setActiveTab('profile');
                setManagingBookId(null);
              }}
              className={`px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm font-medium border-b-2 flex items-center gap-1.5 md:gap-2 whitespace-nowrap ${
                activeTab === 'profile'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              <User size={16} className="md:w-[18px] md:h-[18px]" />
              Profile
            </button>

            <button
              onClick={() => {
                setActiveTab('books');
                setManagingBookId(null);
              }}
              className={`px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm font-medium border-b-2 flex items-center gap-1.5 md:gap-2 whitespace-nowrap ${
                activeTab === 'books'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              <Book size={16} className="md:w-[18px] md:h-[18px]" />
              Books
            </button>

            <button
              onClick={() => {
                setActiveTab('chapters');
                setManagingBookId(null);
              }}
              className={`px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm font-medium border-b-2 flex items-center gap-1.5 md:gap-2 whitespace-nowrap ${
                activeTab === 'chapters'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              <FileText size={16} className="md:w-[18px] md:h-[18px]" />
              <span className="hidden sm:inline">Standalone Chapters</span>
              <span className="sm:hidden">Chapters</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('sales');
                setManagingBookId(null);
              }}
              className={`px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm font-medium border-b-2 flex items-center gap-1.5 md:gap-2 whitespace-nowrap ${
                activeTab === 'sales'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              <IndianRupee size={16} className="md:w-[18px] md:h-[18px]" />
              Sales
            </button>

            {/* NEW READERS TAB */}
            <button
              onClick={() => {
                setActiveTab('readers');
                setManagingBookId(null);
              }}
              className={`px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm font-medium border-b-2 flex items-center gap-1.5 md:gap-2 whitespace-nowrap ${
                activeTab === 'readers'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              <Users size={16} className="md:w-[18px] md:h-[18px]" />
              Readers
            </button>
          </nav>
        </div>

        <div className="p-4 md:p-6">
          {activeTab === 'profile' && profile && (
            <AuthorProfileSection 
              authorUser={profile}
              canEdit={true}
            />
          )}
          {activeTab === 'books' && (
            managingBookId ? (
              <BookChapterManager 
                bookId={managingBookId}
                bookTitle={managingBookTitle}
                onBack={handleBackToBooks}
              />
            ) : (
              <BookManager onManageChapters={handleManageChapters} />
            )
          )}
          {activeTab === 'chapters' && <ChapterManagement />}
          {activeTab === 'sales' && <SalesDashboard />}
          {activeTab === 'readers' && <ReaderManagement />}
        </div>
      </div>
    </div>
  );
}