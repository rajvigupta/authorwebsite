import { useState, useEffect } from 'react';
import { FileText, Plus, Edit2, Trash2, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ChapterEditor } from './ChapterEditor';
import type { Chapter } from '../lib/supabase';
import { useToast } from './Toast';

type BookChapterManagerProps = {
  bookId: string;
  bookTitle: string;
  onBack: () => void;
};

export function BookChapterManager({ bookId, bookTitle, onBack }: BookChapterManagerProps) {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
  const [sendingNotifications, setSendingNotifications] = useState<string | null>(null);
const [notificationResults, setNotificationResults] = useState<Record<string, number>>({});
  const toast = useToast();


  useEffect(() => {
    loadChapters();
  }, [bookId]);

  const loadChapters = async () => {
    try {
      const { data, error } = await supabase
        .from('chapters')
        .select('*')
        .eq('book_id', bookId)
        .order('chapter_number');

      if (error) throw error;
      setChapters(data || []);
    } catch (error) {
      console.error('Error loading chapters:', error);
    } finally {
      setLoading(false);
    }
  };



const handleDelete = async (chapterId: string) => {
  if (!confirm('Delete this chapter? This cannot be undone.')) return;

  try {
    const { error } = await supabase.from('chapters').delete().eq('id', chapterId);

    if (error) throw error;
    toast.success('🗑️ Chapter deleted successfully'); // ✅ NEW
    loadChapters();
  } catch (error) {
    console.error('Error deleting chapter:', error);
    toast.error('Failed to delete chapter'); // ✅ NEW
  }
};

const togglePublish = async (chapter: Chapter) => {
  const action = chapter.is_published ? 'unpublish' : 'publish';
  const confirmed = window.confirm(
    `Are you sure you want to ${action} "Chapter ${chapter.chapter_number}: ${chapter.title}"?\n\n${
      chapter.is_published 
        ? 'This will hide the chapter from readers.' 
        : 'This will make the chapter visible to readers who purchase it.'
    }`
  );

  if (!confirmed) return;
  
  try {
    const { error } = await supabase
      .from('chapters')
      .update({ is_published: !chapter.is_published })
      .eq('id', chapter.id);

    if (error) throw error;
    
    if (chapter.is_published) {
      toast.info(`Chapter ${chapter.chapter_number} unpublished`); // ✅ NEW
    } else {
      toast.success(`🚀 Chapter ${chapter.chapter_number} is now published!`); // ✅ NEW
    }
    
    loadChapters();
  } catch (error) {
    console.error('Error updating chapter:', error);
    toast.error('Failed to update chapter'); // ✅ NEW
  }
};
  const handleEdit = (chapter: Chapter) => {
    setEditingChapter(chapter);
    setShowEditor(true);
  };

  const handleSave = () => {
    setShowEditor(false);
    setEditingChapter(null);
    loadChapters();
  };

  const handleCancel = () => {
    setShowEditor(false);
    setEditingChapter(null);
  };

  const handleSendNotifications = async (chapter: Chapter) => {
  setSendingNotifications(chapter.id);
  
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-chapter-notification`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          chapterId: chapter.id,
          chapterTitle: chapter.title,
          chapterNumber: chapter.chapter_number,
          bookId: bookId, // ✅ Pass bookId for book chapters
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to send notifications');
    }

    const result = await response.json();
    setNotificationResults(prev => ({ ...prev, [chapter.id]: result.sent }));
    toast.success(`✅ Sent ${result.sent} email notification${result.sent !== 1 ? 's' : ''}!`);
    
  } catch (error: any) {
    console.error('Error sending notifications:', error);
    toast.error(`Failed to send notifications: ${error.message}`);
  } finally {
    setSendingNotifications(null);
  }
};

  if (loading) {
    return <div className="text-center py-12">Loading chapters...</div>;
  }

  if (showEditor) {
    return (
      <div>
        <button
          onClick={handleCancel}
          className="flex items-center gap-2 text-gray-400 hover:text-white dark:hover:text-white mb-4"
        >
          <ArrowLeft size={20} />
          Back to Chapters
        </button>
        <ChapterEditor
          bookId={bookId}
          editingChapter={editingChapter}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 text-gray-400 hover:text-white dark:hover:text-white"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-white">
              Chapters for: {bookTitle}
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              {chapters.length} chapter{chapters.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowEditor(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          <Plus size={20} />
          Add Chapter
        </button>
      </div>

      {chapters.length === 0 ? (
        <div className="text-center py-12 bg-gray-800 rounded-lg">
          <FileText size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-400 mb-2">
            No chapters yet for this book
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            Click "Add Chapter" to create the first chapter
          </p>
        </div>
      ) : (
        <div className="grid gap-3 md:gap-4">
  {chapters.map((chapter) => (
    <div
      key={chapter.id}
      className="bg-gray-800 rounded-lg p-4 md:p-6 flex flex-col md:flex-row gap-3 md:gap-4 break-words"
    >
      {chapter.cover_image_url && (
        <img
          src={chapter.cover_image_url}
          alt={chapter.title}
          className="w-full md:w-24 h-48 md:h-32 object-cover rounded flex-shrink-0"
        />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg md:text-xl font-bold text-white break-words">
              Chapter {chapter.chapter_number}: {chapter.title}
            </h3>
            <p className="text-gray-400 mt-1 text-sm md:text-base break-words">
              {chapter.description}
            </p>
            <p className="text-primary-600 font-semibold mt-2 text-base md:text-lg">
              ₹{chapter.price}
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span
                className={`px-2 md:px-3 py-1 rounded-full text-xs md:text-sm ${
                  chapter.is_published
                    ? 'bg-green-900 text-green-200'
                    : 'bg-gray-700 text-gray-300'
                }`}
              >
                {chapter.is_published ? 'Published' : 'Draft'}
              </span>
              <span className="px-2 md:px-3 py-1 rounded-full text-xs md:text-sm bg-blue-900 text-blue-200">
                {chapter.content_type === 'pdf' ? 'PDF' : 'Rich Text'}
              </span>
            </div>
          </div>
          <div className="flex md:flex-col gap-2 flex-shrink-0">
            <button
              onClick={() => togglePublish(chapter)}
              className="p-2 text-gray-400 hover:text-white dark:hover:text-white"
              title={chapter.is_published ? 'Unpublish' : 'Publish'}
            >
              {chapter.is_published ? <EyeOff size={18} className="md:w-5 md:h-5" /> : <Eye size={18} className="md:w-5 md:h-5" />}
            </button>
            <button
              onClick={() => handleEdit(chapter)}
              className="p-2 text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
              title="Edit chapter"
            >
              <Edit2 size={18} className="md:w-5 md:h-5" />
            </button>
            <button
              onClick={() => handleDelete(chapter.id)}
              className="p-2 text-red-400 hover:text-red-800 dark:hover:text-red-300"
              title="Delete chapter"
            >
              <Trash2 size={18} className="md:w-5 md:h-5" />
            </button>

            {/* Email Notification Button - Only show if published */}
{chapter.is_published && (
  <button
    onClick={() => handleSendNotifications(chapter)}
    disabled={sendingNotifications === chapter.id}
    className={`p-2 ${
      sendingNotifications === chapter.id
        ? 'text-gray-400 cursor-wait'
        : 'text-green-400 hover:text-green-600 dark:hover:text-green-300'
    }`}
    title="Send email notifications"
  >
    {sendingNotifications === chapter.id ? (
      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    ) : (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    )}
  </button>
)}

{/* Show result if notifications were sent */}
{notificationResults[chapter.id] !== undefined && (
  <span className="text-xs text-green-400 ml-2">
    ✓ {notificationResults[chapter.id]} sent
  </span>
)}
          </div>
        </div>
      </div>
    </div>
  ))}
</div>
      )}
    </div>
  );
}