import { useState, useEffect } from 'react';
import { FileText, File } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { RichTextEditor } from './RichTextEditor';
import type { Chapter, Book } from '../lib/supabase';
import { useToast } from './Toast';
import { convertPdfToWatermarkedImages, WatermarkedPage } from '../utils/pdfToImages';

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
    is_free : false,
  });

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [richContent, setRichContent] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [autoNumbering, setAutoNumbering] = useState(true);
  const [suggestedNumber, setSuggestedNumber] = useState<number>(1);
  const toast = useToast();
  const [processingPdf, setProcessingPdf] = useState(false);
const [conversionProgress, setConversionProgress] = useState(0);
  

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
        is_free: editingChapter.is_free || false,
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

  // ✅ NEW: Handle PDF conversion to watermarked images
const handlePdfUpload = async (file: File) => {
  if (!file.type.includes('pdf')) {
    toast.error('Please upload a PDF file');
    return;
  }

  setProcessingPdf(true);
  setConversionProgress(0);

  try {
    // Convert PDF to watermarked images
    toast.info('🔄 Converting PDF to protected images...');
    
    const watermarkText = profile?.email || 'Protected Content';
    const pages = await convertPdfToWatermarkedImages(file, watermarkText);
    
    setConversionProgress(50);
    toast.info(`✓ Converted ${pages.length} pages. Uploading...`);
    
    // Upload each image to Supabase storage
    const imageUrls: string[] = [];
    
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      
      // Convert base64 to blob
      const blob = await fetch(page.imageData).then(r => r.blob());
      
      // Upload to storage
      const fileName = `${Date.now()}_page_${page.pageNumber}.jpg`;
      const filePath = `${profile?.id}/${fileName}`;
      
      const { error: uploadError, data } = await supabase.storage
        .from('chapter-images')
        .upload(filePath, blob, {
          contentType: 'image/jpeg',
          upsert: false,
        });
      
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('chapter-images')
        .getPublicUrl(filePath);
      
      imageUrls.push(urlData.publicUrl);
      
      // Update progress
      const progress = 50 + ((i + 1) / pages.length) * 50;
      setConversionProgress(Math.round(progress));
    }
    
    // Store image URLs as special page-image format
    const imageContent = imageUrls.map((url, index) => ({
      type: 'page-image',
      url,
      pageNumber: index + 1,
    }));
    
    // Store as 'text' content type (we use rich_content field)
    setContentType('text');
    setRichContent(imageContent);
    
    toast.success(`✅ PDF converted! ${pages.length} pages ready.`);
    
  } catch (error: any) {
    console.error('PDF conversion error:', error);
    toast.error(`Failed to convert PDF: ${error.message}`);
  } finally {
    setProcessingPdf(false);
    setConversionProgress(0);
  }
};

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setUploading(true);

  try {
    let coverImageUrl = editingChapter?.cover_image_url || null;

    // Handle cover image upload
    if (coverImage) {
      toast.info('Uploading cover image...');
      
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

    // ✅ FIXED: Simplified chapter data structure
    const chapterData = {
      book_id: bookId || null,
      title: formData.title,
      description: formData.description || null,
      price: parseFloat(formData.price),
      is_free: formData.is_free,
      chapter_number: parseInt(formData.chapter_number),
      content_type: 'text', // Always text (for both rich text and images)
      pdf_url: null, // No more PDFs
      rich_content: richContent.length > 0 ? richContent : null,
      cover_image_url: coverImageUrl,
      is_published: formData.is_published,
    };

    // Validation
    if (contentType === 'pdf' && richContent.length === 0 && !editingChapter) {
      toast.error('Please upload a PDF file');
      setUploading(false);
      return;
    }

    if (contentType === 'text' && (!richContent || richContent.length === 0)) {
      toast.error('Please add some content');
      setUploading(false);
      return;
    }

    if (!bookId && !formData.description.trim()) {
      toast.error('Description is required for standalone chapters');
      setUploading(false);
      return;
    }

    // Save to database
    if (editingChapter) {
      const { error } = await supabase
        .from('chapters')
        .update(chapterData)
        .eq('id', editingChapter.id);

      if (error) throw error;
      toast.success('✏️ Chapter updated successfully!');
    } else {
      const { error } = await supabase.from('chapters').insert([chapterData]);
      if (error) throw error;
      toast.success('🎉 Chapter created successfully!');
    }

    onSave();
  } catch (error: any) {
    console.error('Error saving chapter:', error);
    toast.error(`Failed to save chapter: ${error.message}`);
  } finally {
    setUploading(false);
  }
};



  return (
    <form onSubmit={handleSubmit} className="bg-gray-800 rounded-lg p-6 space-y-6">
      <h3 className="text-xl font-semibold text-white">
        {editingChapter ? 'Edit Chapter' : 'Create New Chapter'}
        {bookId ? ' for Book' : ' (Standalone)'}
      </h3>

      {/* Content Type Selection */}
      {!editingChapter && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">
            Content Type
          </label>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setContentType('pdf')}
              className={`p-4 border-2 rounded-lg flex flex-col items-center gap-2 transition-colors ${
                contentType === 'pdf'
                  ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-600 hover:border-gray-400'
              }`}
            >
              <File size={32} className={contentType === 'pdf' ? 'text-primary-600' : 'text-gray-400'} />
              <span className="font-medium text-white">PDF Upload</span>
              <span className="text-xs text-gray-400">Upload a PDF file</span>
            </button>
            <button
              type="button"
              onClick={() => setContentType('text')}
              className={`p-4 border-2 rounded-lg flex flex-col items-center gap-2 transition-colors ${
                contentType === 'text'
                  ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-600 hover:border-gray-400'
              }`}
            >
              <FileText size={32} className={contentType === 'text' ? 'text-primary-600' : 'text-gray-400'} />
              <span className="font-medium text-white">Text</span>
              <span className="text-xs text-gray-400">Write directly</span>
            </button>
          </div>
        </div>
      )}

      {/* Chapter Number with Auto-numbering */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
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
              className="w-full px-4 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white"
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
                <label htmlFor="auto-number" className="text-xs text-gray-400">
                  Auto-number (Next: {suggestedNumber})
                </label>
              </div>
            )}
          </div>
        </div>
<div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Price (INR)
          </label>
          <input
            type="number"
            required
            min="0"
            step="0.01"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            disabled={formData.is_free}
            className="w-full px-4 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-100 dark:disabled:bg-gray-800"
          />
          {formData.is_free && (
            <p className="text-xs text-green-400 mt-1 font-semibold">
              💚 Price is automatically ₹0 for free chapters
            </p>
          )}
        </div>
      </div>



      {/* ✅ FREE CHAPTER TOGGLE - THIS IS THE NEW SECTION */}
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="is-free"
            checked={formData.is_free}
            onChange={(e) => setFormData({ 
              ...formData, 
              is_free: e.target.checked,
              price: e.target.checked ? '0' : formData.price
            })}
            className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
          />
          <label htmlFor="is-free" className="flex-1 cursor-pointer">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-white">
                Make this chapter FREE
              </span>
              <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded-full font-semibold">
                FREE
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {formData.is_free 
                ? 'This chapter will be accessible to all users without payment'
                : 'Check this to make the chapter free for all readers'
              }
            </p>
          </label>
        </div>
      </div>
      {/* ✅ END OF NEW SECTION */}

      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Title
        </label>
        <input
          type="text"
          required
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="w-full px-4 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white"
        />
      </div>

      {/* Description - Required for standalone, optional for book chapters */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Description {!bookId && <span className="text-red-500">*</span>} {bookId && <span className="text-gray-500 text-xs">(Optional)</span>}
        </label>
        <textarea
          required={!bookId} // Only required for standalone chapters
          rows={3}
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="w-full px-4 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white"
          placeholder={bookId ? "Optional description for this chapter..." : "Describe what readers can expect..."}
        />
      </div>

      {/* PDF Upload */}
{contentType === 'pdf' && (
  <div>
    <label className="block text-sm font-medium text-gray-300 mb-2">
      PDF File (will be converted to protected images)
    </label>
    
    <div className="space-y-3">
      <input
        type="file"
        accept=".pdf"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handlePdfUpload(file);
        }}
        required={!editingChapter && richContent.length === 0}
        disabled={processingPdf}
        className="w-full px-4 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
      />
      
      {/* Progress indicator */}
      {processingPdf && (
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
            <span className="text-sm text-gray-400">
              Converting PDF to protected images... {conversionProgress}%
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-primary-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${conversionProgress}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Please wait, this may take a moment for large PDFs...
          </p>
        </div>
      )}
      
      {/* Show page count if converted */}
      {richContent.length > 0 && richContent[0]?.type === 'page-image' && (
        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-500/50 rounded-lg">
          <p className="text-sm text-green-700 dark:text-green-400 font-medium">
            ✅ {richContent.length} page{richContent.length !== 1 ? 's' : ''} converted and ready
          </p>
          <p className="text-xs text-green-600 dark:text-green-500 mt-1">
            All pages are watermarked with: {profile?.email}
          </p>
        </div>
      )}
    </div>
    
    {editingChapter && editingChapter.content_type === 'pdf' && (
      <p className="text-xs text-gray-400 mt-2">
        Note: Upload a new PDF to replace the current one
      </p>
    )}
  </div>
)}


      
      {/* Rich Text Editor */}
      {contentType === 'text' && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Chapter Content
          </label>
          <RichTextEditor initialContent={richContent} onChange={setRichContent} />
        </div>
      )}

      {/* Cover Image */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Cover Image (Optional)
        </label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setCoverImage(e.target.files?.[0] || null)}
          className="w-full px-4 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white"
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
        <label htmlFor="publish-chapter" className="text-sm text-gray-300">
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
          className="px-6 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}