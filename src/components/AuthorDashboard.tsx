import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { BookManager } from './BookManager';
import { BookChapterManager } from './BookChapterManager';
import { AuthorProfileSection } from './AuthorProfileSection';
import { ChapterManagement } from './ChapterManagement';
import { SalesDashboard } from './SalesDashboard';
import { Book, FileText, User, IndianRupee } from 'lucide-react';

type Tab = 'profile' | 'books' | 'chapters'| 'sales';

export function AuthorDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [managingBookId, setManagingBookId] = useState<string | null>(null);
  const [managingBookTitle, setManagingBookTitle] = useState<string>('');
  const { profile, user, loading } = useAuth();

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Check if user is not logged in
  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 dark:text-gray-400">
          Please log in to access the dashboard.
        </p>
      </div>
    );
  }

  // Check if logged-in user is not an author
  if (profile?.role !== 'author') {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 dark:text-gray-400">
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
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
        Author Dashboard
      </h1>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md mb-6">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex">
            <button
              onClick={() => {
                setActiveTab('profile');
                setManagingBookId(null);
              }}
              className={`px-6 py-4 text-sm font-medium border-b-2 flex items-center gap-2 ${
                activeTab === 'profile'
                  ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <User size={18} />
              Profile
            </button>
            <button
              onClick={() => {
                setActiveTab('books');
                setManagingBookId(null);
              }}
              className={`px-6 py-4 text-sm font-medium border-b-2 flex items-center gap-2 ${
                activeTab === 'books'
                  ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Book size={18} />
              Books
            </button>

            <button
              onClick={() => {
                setActiveTab('chapters');
                setManagingBookId(null);
              }}
              className={`px-6 py-4 text-sm font-medium border-b-2 flex items-center gap-2 ${
                activeTab === 'chapters'
                  ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <FileText size={18} />
              Standalone Chapters
            </button>
          </nav>
        </div>

        <button
  onClick={() => {
    setActiveTab('sales');
    setManagingBookId(null);
  }}
  className={`px-6 py-4 text-sm font-medium border-b-2 flex items-center gap-2 ${
    activeTab === 'sales'
      ? 'border-primary-600 text-primary-600 dark:text-primary-400'
      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
  }`}
>
  <IndianRupee size={18} />
  Sales
</button>

        <div className="p-6">
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
        </div>
      </div>
    </div>
  );
}