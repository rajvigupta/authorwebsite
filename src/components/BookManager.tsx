import { useState, useEffect } from 'react';
import { Book, Plus, Edit2, Trash2, Eye, EyeOff, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Book as BookType } from '../lib/supabase';

type BookManagerProps = {
  onManageChapters?: (bookId: string, bookTitle: string) => void;
};

export function BookManager({ onManageChapters }: BookManagerProps) {
  const [books, setBooks] = useState<BookType[]>([]);
  const [chapterCounts, setChapterCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingBook, setEditingBook] = useState<BookType | null>(null);
  const { profile } = useAuth();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    author_note: '',
    is_published: false,
  });
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadBooks();
  }, []);

  const loadBooks = async () => {
    try {
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBooks(data || []);

      // Load chapter counts for each book
      if (data) {
        const counts: Record<string, number> = {};
        for (const book of data) {
          const { count } = await supabase
            .from('chapters')
            .select('*', { count: 'exact', head: true })
            .eq('book_id', book.id);
          counts[book.id] = count || 0;
        }
        setChapterCounts(counts);
      }
    } catch (error) {
      console.error('Error loading books:', error);
    } finally {
      setLoading(false);
    }
  };

// Replace the entire handleSubmit function in BookManager.tsx:

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setUploading(true);

  try {
    let coverImageUrl = editingBook?.cover_image_url || null;

    if (coverImage) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      const fileType = coverImage.type || '';
      
      if (!allowedTypes.includes(fileType)) {
        throw new Error(`Invalid file type: ${fileType}. Allowed: JPEG, PNG, WebP`);
      }

      // Validate file size (5MB max)
      const maxSize = 5 * 1024 * 1024;
      if (coverImage.size > maxSize) {
        throw new Error('File too large. Maximum size is 5MB');
      }

      const fileExt = coverImage.name.split('.').pop()?.toLowerCase();
      
      // Ensure file extension matches type
      const validExt = fileType.includes('jpeg') || fileType.includes('jpg') ? 'jpg' : 
                       fileType.includes('png') ? 'png' : 
                       fileType.includes('webp') ? 'webp' : null;
      
      if (!validExt) {
        throw new Error('Could not determine file type');
      }

      const filePath = `${profile?.id}/${Date.now()}.${validExt}`;
      
      console.log('📤 Uploading book cover:', {
        path: filePath,
        size: `${(coverImage.size / 1024).toFixed(2)} KB`,
        type: fileType,
        name: coverImage.name
      });

      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('book-covers')
        .upload(filePath, coverImage, {
          cacheControl: '3600',
          upsert: true,
          contentType: fileType // Now guaranteed to be valid
        });

      if (uploadError) {
        console.error('❌ Upload error:', uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      if (!uploadData) {
        throw new Error('Upload succeeded but no data returned');
      }

      console.log('✅ Upload successful:', uploadData);

      const { data: urlData } = supabase.storage
        .from('book-covers')
        .getPublicUrl(filePath);

      if (!urlData?.publicUrl) {
        throw new Error('Failed to get public URL');
      }

      coverImageUrl = urlData.publicUrl;
      console.log('✅ Public URL:', coverImageUrl);
    }

    const bookData = {
      title: formData.title,
      description: formData.description,
      author_note: formData.author_note || null,
      price: 0,
      cover_image_url: coverImageUrl,
      is_published: formData.is_published,
    };

    console.log('💾 Saving book data:', bookData);

    if (editingBook) {
      const { error } = await supabase
        .from('books')
        .update(bookData)
        .eq('id', editingBook.id);

      if (error) {
        console.error('❌ Update error:', error);
        throw error;
      }
      console.log('✅ Book updated');
    } else {
      const { error } = await supabase
        .from('books')
        .insert([bookData]);

      if (error) {
        console.error('❌ Insert error:', error);
        throw error;
      }
      console.log('✅ Book created');
    }

    resetForm();
    loadBooks();
  } catch (error: any) {
    console.error('❌ Error saving book:', error);
    alert(error.message || 'Failed to save book');
  } finally {
    setUploading(false);
  }
};

  const handleEdit = (book: BookType) => {
    setEditingBook(book);
    setFormData({
      title: book.title,
      description: book.description,
      author_note: book.author_note || '',
      is_published: book.is_published,
    });
    setShowForm(true);
  };

  const handleDelete = async (bookId: string) => {
    if (!confirm('Delete this book? All chapters in this book will also be deleted.')) return;

    try {
      const { error } = await supabase.from('books').delete().eq('id', bookId);

      if (error) throw error;
      loadBooks();
    } catch (error) {
      console.error('Error deleting book:', error);
      alert('Failed to delete book');
    }
  };

  const togglePublish = async (book: BookType) =>
     {
      const action = book.is_published ? 'unpublish' : 'publish';
  const confirmed = window.confirm(
    `Are you sure you want to ${action} "${book.title}"?\n\n${
      book.is_published 
        ? 'This will hide the book from readers.' 
        : 'This will make the book visible to all readers.'
    }`
  );

  if (!confirmed) return
    try {
      const { error } = await supabase
        .from('books')
        .update({ is_published: !book.is_published })
        .eq('id', book.id);

      if (error) throw error;
      loadBooks();
    } catch (error) {
      console.error('Error updating book:', error);
      alert('Failed to update book');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      author_note: '',
      is_published: false,
    });
    setCoverImage(null);
    setEditingBook(null);
    setShowForm(false);
  };

  if (loading) {
    return <div className="text-center py-12">Loading books...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Manage Books</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          <Plus size={20} />
          {showForm ? 'Cancel' : 'Create Book'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg p-6 space-y-4">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            {editingBook ? 'Edit Book' : 'Create New Book'}
          </h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Title
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              required
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Author Note (Optional)
            </label>
            <textarea
              rows={3}
              value={formData.author_note}
              onChange={(e) => setFormData({ ...formData, author_note: e.target.value })}
              placeholder="Add a personal note about this book series..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Cover Image
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setCoverImage(e.target.files?.[0] || null)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="publish"
              checked={formData.is_published}
              onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
              className="w-4 h-4"
            />
            <label htmlFor="publish" className="text-sm text-gray-700 dark:text-gray-300">
              Publish immediately
            </label>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={uploading}
              className="flex-1 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {uploading ? 'Saving...' : editingBook ? 'Update Book' : 'Create Book'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="grid gap-4">
       {books.length === 0 ? (
  <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
    <Book size={48} className="mx-auto text-gray-400 mb-4" />
    <p className="text-gray-600 dark:text-gray-400">No books yet. Create your first book!</p>
  </div>
) : (
  books.map((book) => (
    <div
      key={book.id}
      className="bg-white dark:bg-gray-800 rounded-lg p-4 md:p-6 flex flex-col md:flex-row gap-3 md:gap-4 break-words" // Added break-words
    >
      {book.cover_image_url && (
        <img
          src={book.cover_image_url}
          alt={book.title}
          className="w-full md:w-24 h-48 md:h-32 object-cover rounded flex-shrink-0"
        />
      )}
      <div className="flex-1 min-w-0"> {/* Added min-w-0 for text truncation */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white break-words">
              {book.title}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm md:text-base break-words">
              {book.description}
            </p>
            <div className="flex flex-wrap items-center gap-2 md:gap-3 mt-3">
              <span
                className={`inline-block px-2 md:px-3 py-1 rounded-full text-xs md:text-sm ${
                  book.is_published
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                {book.is_published ? 'Published' : 'Draft'}
              </span>
              <span className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                {chapterCounts[book.id] || 0} chapter{chapterCounts[book.id] !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
          <div className="flex md:flex-col gap-2 flex-shrink-0">
            <button
              onClick={() => togglePublish(book)}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              title={book.is_published ? 'Unpublish' : 'Publish'}
            >
              {book.is_published ? <EyeOff size={18} className="md:w-5 md:h-5" /> : <Eye size={18} className="md:w-5 md:h-5" />}
            </button>
            <button
              onClick={() => handleEdit(book)}
              className="p-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
              title="Edit book details"
            >
              <Edit2 size={18} className="md:w-5 md:h-5" />
            </button>
            <button
              onClick={() => handleDelete(book.id)}
              className="p-2 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
              title="Delete book"
            >
              <Trash2 size={18} className="md:w-5 md:h-5" />
            </button>
          </div>
        </div>
        
        {/* Manage Chapters Button */}
        <button
          onClick={() => onManageChapters?.(book.id, book.title)}
          className="mt-4 w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors text-sm"
        >
          <FileText size={16} />
          Manage Chapters ({chapterCounts[book.id] || 0})
        </button>
      </div>
    </div>
  ))
)}
      </div>
    </div>
  );
}