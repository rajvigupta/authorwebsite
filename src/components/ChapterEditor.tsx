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
      if (editingChapter.rich_content) {
        setRichContent(editingChapter.rich_content as any);
      }
    }
  }, [editingChapter]);

  // In ChapterEditor.tsx, find the handleSubmit function and update these sections:

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setUploading(true);

  try {
    let pdfUrl = editingChapter?.pdf_url || null;
    let coverImageUrl = editingChapter?.cover_image_url || null;

    // ✅ FIXED: PDF Upload with folder structure
if (contentType === 'pdf' && pdfFile) {
  const fileExt = pdfFile.name.split('.').pop();
  const filePath = `${profile?.id}/${Date.now()}.${fileExt}`;

  console.log('📄 Uploading PDF to:', filePath);

  const { error: uploadError, data: uploadData } = await supabase.storage
    .from('chapter-pdfs')
    .upload(filePath, pdfFile, {
      upsert: true,
      contentType: pdfFile.type || 'application/pdf'
    });

  if (uploadError) {
    console.error('❌ PDF upload error:', uploadError);
    throw uploadError;
  }

  console.log('✅ PDF upload data:', uploadData);

  const { data: urlData } = supabase.storage
    .from('chapter-pdfs')
    .getPublicUrl(filePath);

  if (!urlData?.publicUrl) {
    throw new Error('Failed to get PDF public URL');
  }

  pdfUrl = urlData.publicUrl;
  console.log('✅ PDF URL:', pdfUrl);
}

    // ✅ FIXED: Cover Image Upload with folder structure
    if (coverImage) {
      const fileExt = coverImage.name.split('.').pop();
      const filePath = `${profile?.id}/${Date.now()}.${fileExt}`;  // ✅ Added folder

      console.log('Uploading chapter cover to:', filePath);

      const { error: uploadError } = await supabase.storage
        .from('chapter-covers')
        .upload(filePath, coverImage, {
          upsert: true,
          contentType: coverImage.type
        });

      if (uploadError) {
        console.error('Cover upload error:', uploadError);
        throw uploadError;
      }

      const { data } = supabase.storage.from('chapter-covers').getPublicUrl(filePath);
      coverImageUrl = data.publicUrl;
      
      console.log('Chapter cover uploaded:', coverImageUrl);
    }

    const chapterData = {
      book_id: bookId || null,
      title: formData.title,
      description: formData.description,
      price: parseFloat(formData.price),
      chapter_number: parseInt(formData.chapter_number),
      content_type: contentType,
      pdf_url: contentType === 'pdf' ? pdfUrl : null,
      rich_content: contentType === 'text' ? richContent : null,
      cover_image_url: coverImageUrl,
      is_published: formData.is_published,
    };

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
        {bookId && ' for Book'}
      </h3>

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

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Chapter Number
          </label>
          <input
            type="number"
            required
            min="1"
            value={formData.chapter_number}
            onChange={(e) => setFormData({ ...formData, chapter_number: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
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
          rows={3}
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
      </div>

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

      {contentType === 'text' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Chapter Content
          </label>
          <RichTextEditor initialContent={richContent} onChange={setRichContent} />
        </div>
      )}

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
