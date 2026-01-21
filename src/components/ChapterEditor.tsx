import { useState, useEffect } from 'react';
import { FileText, File } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { RichTextEditor } from './RichTextEditor';
import type { Chapter, Book } from '../lib/supabase';

type ChapterEditorProps = {
  bookId?: string | null;
  editingChapter?: Chapter | null;
  onSave: () => void;
  onCancel: () => void;
};

export function ChapterEditor({ bookId, editingChapter, onSave, onCancel }: ChapterEditorProps) {
  const { profile } = useAuth();
  const [contentType, setContentType] = useState<'pdf' | 'text'>(
    editingChapter?.content_type || 'pdf'
  );
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    chapter_number: '1',
    is_published: false,
  });
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [richContent, setRichContent] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [autoNumbering, setAutoNumbering] = useState(true);
  const [suggestedNumber, setSuggestedNumber] = useState<number>(1);

  // Fetch next chapter number on mount
  useEffect(() => {
    if (!editingChapter && autoNumbering) {
      fetchNextChapterNumber();
    }
  }, [bookId, autoNumbering]);

  useEffect(() => {
    if (editingChapter) {
      setFormData({
        title: editingChapter.title,
        description: editingChapter.description,
        price: editingChapter.price.toString(),
        chapter_number: editingChapter.chapter_number.toString(),
        is_published: editingChapter.is_published,
      });
      setContentType(editingChapter.content_type);
      setAutoNumbering(false); // Disable auto-numbering when editing
      if (editingChapter.rich_content) {
        setRichContent(editingChapter.rich_content as any);
      }
    }
  }, [editingChapter]);

  const fetchNextChapterNumber = async () => {
    try {
      const query = bookId
        ? supabase.from('chapters').select('chapter_number').eq('book_id', bookId)
        : supabase.from('chapters').select('chapter_number').is('book_id', null);

      const { data, error } = await query.order('chapter_number', { ascending: false }).limit(1);

      if (error) throw error;

      const nextNumber = data && data.length > 0 ? data[0].chapter_number + 1 : 1;
      setSuggestedNumber(nextNumber);
      setFormData(prev => ({ ...prev, chapter_number: nextNumber.toString() }));
    } catch (error) {
      console.error('Error fetching next chapter number:', error);
      setSuggestedNumber(1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);

    try {
      let pdfUrl = editingChapter?.pdf_url || null;
      let coverImageUrl = editingChapter?.cover_image_url || null;

      // Upload PDF if provided
      if (contentType === 'pdf' && pdfFile) {
        const fileExt = pdfFile.name.split('.').pop();
        const filePath = `${profile?.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError, data: uploadData } = await supabase.storage
          .from('chapter-pdfs')
          .upload(filePath, pdfFile, {
            upsert: true,
            contentType: pdfFile.type || 'application/pdf'
          });

        if (uploadError) throw uploadError;
        if (!uploadData) throw new Error('Upload failed - no data returned');

        const { data: urlData } = supabase.storage
          .from('chapter-pdfs')
          .getPublicUrl(filePath);

        if (!urlData?.publicUrl) throw new Error('Failed to get PDF public URL');
        pdfUrl = urlData.publicUrl;
      }

      // Upload cover image if provided
      if (coverImage) {
        const fileExt = coverImage.name.split('.').pop();
        const filePath = `${profile?.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('chapter-covers')
          .upload(filePath, coverImage, {
            upsert: true,
            contentType: coverImage.type
          });

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('chapter-covers').getPublicUrl(filePath);
        coverImageUrl = data.publicUrl;
      }

      const chapterData = {
        book_id: bookId || null,
        title: formData.title,
        description: formData.description || null, // Allow empty description for book chapters
        price: parseFloat(formData.price),
        chapter_number: parseInt(formData.chapter_number),
        content_type: contentType,
        pdf_url: contentType === 'pdf' ? pdfUrl : null,
        rich_content: contentType === 'text' ? richContent : null,
        cover_image_url: coverImageUrl,
        is_published: formData.is_published,
      };

      // Validate required fields
      if (contentType === 'pdf' && !pdfUrl && !editingChapter) {
        alert('Please upload a PDF file');
        setUploading(false);
        return;
      }

      if (contentType === 'text' && (!richContent || richContent.length === 0)) {
        alert('Please add some content');
        setUploading(false);
        return;
      }

      // For standalone chapters, description is required
      if (!bookId && !formData.description.trim()) {
        alert('Description is required for standalone chapters');
        setUploading(false);
        return;
      }

      if (editingChapter) {
        const { error } = await supabase
          .from('chapters')
          .update(chapterData)
          .eq('id', editingChapter.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('chapters').insert([chapterData]);
        if (error) throw error;
      }

      onSave();
    } catch (error) {
      console.error('Error saving chapter:', error);
      alert('Failed to save chapter');
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg p-6 space-y-6">
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
        {editingChapter ? 'Edit Chapter' : 'Create New Chapter'}
        {bookId ? ' for Book' : ' (Standalone)'}
      </h3>

      {/* Content Type Selection */}
      {!editingChapter && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Content Type
          </label>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setContentType('pdf')}
              className={`p-4 border-2 rounded-lg flex flex-col items-center gap-2 transition-colors ${
                contentType === 'pdf'
                  ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
              }`}
            >
              <File size={32} className={contentType === 'pdf' ? 'text-primary-600' : 'text-gray-400'} />
              <span className="font-medium text-gray-900 dark:text-white">PDF Upload</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">Upload a PDF file</span>
            </button>
            <button
              type="button"
              onClick={() => setContentType('text')}
              className={`p-4 border-2 rounded-lg flex flex-col items-center gap-2 transition-colors ${
                contentType === 'text'
                  ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
              }`}
            >
              <FileText size={32} className={contentType === 'text' ? 'text-primary-600' : 'text-gray-400'} />
              <span className="font-medium text-gray-900 dark:text-white">Rich Text</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">Write directly</span>
            </button>
          </div>
        </div>
      )}

      {/* Chapter Number with Auto-numbering */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Chapter Number
          </label>
          <div className="space-y-2">
            <input
              type="number"
              required
              min="1"
              value={formData.chapter_number}
              onChange={(e) => {
                setFormData({ ...formData, chapter_number: e.target.value });
                setAutoNumbering(false); // Disable auto when manually changed
              }}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            {!editingChapter && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="auto-number"
                  checked={autoNumbering}
                  onChange={(e) => {
                    setAutoNumbering(e.target.checked);
                    if (e.target.checked) {
                      setFormData({ ...formData, chapter_number: suggestedNumber.toString() });
                    }
                  }}
                  className="w-4 h-4"
                />
                <label htmlFor="auto-number" className="text-xs text-gray-600 dark:text-gray-400">
                  Auto-number (Next: {suggestedNumber})
                </label>
              </div>
            )}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Price (INR)
          </label>
          <input
            type="number"
            required
            min="0"
            step="0.01"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
      </div>

      {/* Title */}
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

      {/* Description - Required for standalone, optional for book chapters */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Description {!bookId && <span className="text-red-500">*</span>} {bookId && <span className="text-gray-500 text-xs">(Optional)</span>}
        </label>
        <textarea
          required={!bookId} // Only required for standalone chapters
          rows={3}
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder={bookId ? "Optional description for this chapter..." : "Describe what readers can expect..."}
        />
      </div>

      {/* PDF Upload */}
      {contentType === 'pdf' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            PDF File {editingChapter && '(leave empty to keep current file)'}
          </label>
          <input
            type="file"
            accept=".pdf"
            onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
            required={!editingChapter}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
      )}

      {/* Rich Text Editor */}
      {contentType === 'text' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Chapter Content
          </label>
          <RichTextEditor initialContent={richContent} onChange={setRichContent} />
        </div>
      )}

      {/* Cover Image */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Cover Image (Optional)
        </label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setCoverImage(e.target.files?.[0] || null)}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
      </div>

      {/* Publish Checkbox */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="publish-chapter"
          checked={formData.is_published}
          onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
          className="w-4 h-4"
        />
        <label htmlFor="publish-chapter" className="text-sm text-gray-700 dark:text-gray-300">
          Publish immediately
        </label>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={uploading}
          className="flex-1 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
        >
          {uploading ? 'Saving...' : editingChapter ? 'Update Chapter' : 'Create Chapter'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}