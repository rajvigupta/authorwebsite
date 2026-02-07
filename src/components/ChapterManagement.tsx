import { useState, useEffect } from 'react';
import { FileText, Plus, Edit2, Trash2, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ChapterEditor } from './ChapterEditor';
import type { Chapter } from '../lib/supabase';
import { useToast } from './Toast';

export function ChapterManagement() {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
  const toast = useToast()

  useEffect(() => {
    loadChapters();
  }, []);

  const loadChapters = async () => {
    try {
      const { data, error } = await supabase
        .from('chapters')
        .select('*')
        .is('book_id', null)
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
    if (!confirm('Delete this chapter?')) return;

    try {
      const { error } = await supabase.from('chapters').delete().eq('id', chapterId);

      if (error) throw error;
       toast.success('🗑️ Chapter deleted successfully');
      loadChapters();
    } catch (error) {
      console.error('Error deleting chapter:', error);
      toast.error('Failed to delete chapter');
    }
  };

  const togglePublish = async (chapter: Chapter) => {
    const action = chapter.is_published ? 'unpublish' : 'publish';
    const confirmed = window.confirm(
      `Are you sure you want to ${action} "Chapter ${chapter.chapter_number}: ${chapter.title}"?\n\n${
        chapter.is_published 
          ? 'This will hide this standalone chapter from the store.' 
          : 'This will make this standalone chapter visible in the store.'
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
      toast.error('Failed to update chapter');
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

  if (loading) {
    return <div className="text-center py-12">Loading chapters...</div>;
  }

  if (showEditor) {
    return (
      <ChapterEditor
        editingChapter={editingChapter}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header - Mobile Responsive */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h2 className="text-xl md:text-2xl font-bold text-white font-cinzel">
          Standalone Chapters
        </h2>
        <button
          onClick={() => setShowEditor(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm md:text-base"
        >
          <Plus size={18} className="md:w-5 md:h-5" />
          Add Chapter
        </button>
      </div>

      {chapters.length === 0 ? (
        <div className="text-center py-12 bg-gray-800 rounded-lg">
          <FileText size={40} className="mx-auto text-gray-400 mb-4 md:w-12 md:h-12" />
          <p className="text-gray-400 text-sm md:text-base px-4">
            No standalone chapters yet. Create your first chapter!
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
                        {chapter.content_type === 'pdf' ? 'PDF' : 'Text'}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons - Horizontal on mobile, vertical on desktop */}
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