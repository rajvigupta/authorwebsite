import { useState, useEffect } from 'react';
import { FileText, Plus, Edit2, Trash2, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ChapterEditor } from './ChapterEditor';
import type { Chapter } from '../lib/supabase';

export function ChapterManagement() {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);

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
      loadChapters();
    } catch (error) {
      console.error('Error deleting chapter:', error);
      alert('Failed to delete chapter');
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
      loadChapters();
    } catch (error) {
      console.error('Error updating chapter:', error);
      alert('Failed to update chapter');
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Standalone Chapters</h2>
        <button
          onClick={() => setShowEditor(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          <Plus size={20} />
          Add Chapter
        </button>
      </div>

      {chapters.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
          <FileText size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            No standalone chapters yet. Create your first chapter!
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {chapters.map((chapter) => (
            <div
              key={chapter.id}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 flex gap-4"
            >
              {chapter.cover_image_url && (
                <img
                  src={chapter.cover_image_url}
                  alt={chapter.title}
                  className="w-24 h-32 object-cover rounded"
                />
              )}
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                      Chapter {chapter.chapter_number}: {chapter.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                      {chapter.description}
                    </p>
                    <p className="text-primary-600 dark:text-primary-400 font-semibold mt-2">
                      ₹{chapter.price}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span
                        className={`px-3 py-1 rounded-full text-sm ${
                          chapter.is_published
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {chapter.is_published ? 'Published' : 'Draft'}
                      </span>
                      <span className="px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        {chapter.content_type === 'pdf' ? 'PDF' : 'Text'}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => togglePublish(chapter)}
                      className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                      title={chapter.is_published ? 'Unpublish' : 'Publish'}
                    >
                      {chapter.is_published ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                    <button
                      onClick={() => handleEdit(chapter)}
                      className="p-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                    >
                      <Edit2 size={20} />
                    </button>
                    <button
                      onClick={() => handleDelete(chapter.id)}
                      className="p-2 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                    >
                      <Trash2 size={20} />
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