import { useState, useEffect } from 'react';
import { Type, Heading1, Heading2, Heading3, Image, Plus, Trash2, MoveUp, MoveDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';


type ContentBlock = {
  id: string;
  type: 'heading' | 'paragraph' | 'image';
  content: string;
  level?: number;
  imageUrl?: string;
  alt?: string;
};

type RichTextEditorProps = {
  initialContent?: ContentBlock[];
  onChange: (content: ContentBlock[]) => void;
};

export function RichTextEditor({ initialContent = [], onChange }: RichTextEditorProps) {
  
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);
  const { profile } = useAuth();
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  useEffect(() => {
  if (initialContent && initialContent.length > 0) {
    setBlocks(initialContent);
  } else {
    setBlocks([{ id: crypto.randomUUID(), type: 'paragraph', content: '' }]);
  }
}, [initialContent]);

const autoResize = (el: HTMLTextAreaElement) => {
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
};


  const updateBlocks = (newBlocks: ContentBlock[]) => {
    setBlocks(newBlocks);
    onChange(newBlocks);
  };

  const addBlock = (type: 'heading' | 'paragraph' | 'image', afterId?: string) => {
    const newBlock: ContentBlock = {
      id: crypto.randomUUID(),
      type,
      content: '',
      ...(type === 'heading' && { level: 2 }),
    };

    if (afterId) {
      const index = blocks.findIndex((b) => b.id === afterId);
      const newBlocks = [...blocks];
      newBlocks.splice(index + 1, 0, newBlock);
      updateBlocks(newBlocks);
    } else {
      updateBlocks([...blocks, newBlock]);
    }
  };

  const updateBlock = (id: string, updates: Partial<ContentBlock>) => {
    updateBlocks(blocks.map((b) => (b.id === id ? { ...b, ...updates } : b)));
  };

  const deleteBlock = (id: string) => {
    if (blocks.length === 1) return;
    updateBlocks(blocks.filter((b) => b.id !== id));
  };

  const moveBlock = (id: string, direction: 'up' | 'down') => {
    const index = blocks.findIndex((b) => b.id === id);
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === blocks.length - 1)
    )
      return;

    const newBlocks = [...blocks];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newBlocks[index], newBlocks[targetIndex]] = [newBlocks[targetIndex], newBlocks[index]];
    updateBlocks(newBlocks);
  };

  const handleImageUpload = async (blockId: string, file: File) => {
    setUploadingImage(blockId);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${profile?.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('chapter-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('chapter-images').getPublicUrl(filePath);

      updateBlock(blockId, {
        imageUrl: data.publicUrl,
        alt: '',
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image');
    } finally {
      setUploadingImage(null);
    }
  };

  return (
    <div className="space-y-4">
      {blocks.map((block, index) => (
        <div
          key={block.id}
          className="group relative bg-gray-800 rounded-lg border-2 border-gray-700 p-4"
        >
          <div className="absolute right-2 top-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={() => moveBlock(block.id, 'up')}
              disabled={index === 0}
              className="p-1 text-gray-500 hover:text-gray-300 disabled:opacity-30"
            >
              <MoveUp size={18} />
            </button>
            <button
              type="button"
              onClick={() => moveBlock(block.id, 'down')}
              disabled={index === blocks.length - 1}
              className="p-1 text-gray-500 hover:text-gray-300 disabled:opacity-30"
            >
              <MoveDown size={18} />
            </button>
            <button
              type="button"
              onClick={() => deleteBlock(block.id)}
              disabled={blocks.length === 1}
              className="p-1 text-red-500 hover:text-red-700 disabled:opacity-30"
            >
              <Trash2 size={18} />
            </button>
          </div>

          {block.type === 'heading' && (
            <div className="space-y-2">
              <select
                value={block.level || 2}
                onChange={(e) => updateBlock(block.id, { level: parseInt(e.target.value) })}
                className="px-2 py-1 border border-gray-600 rounded bg-gray-700 text-white text-sm"
              >
                <option value={1}>H1</option>
                <option value={2}>H2</option>
                <option value={3}>H3</option>
              </select>
              <input
                type="text"
                value={block.content}
                onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                placeholder="Enter heading..."
                className={`w-full font-bold border-0 bg-transparent focus:outline-none focus:ring-0 text-white ${
                  block.level === 1
                    ? 'text-3xl'
                    : block.level === 2
                    ? 'text-2xl'
                    : 'text-xl'
                }`}
              />
            </div>
          )}

          {block.type === 'paragraph' && (
            <textarea
            value={block.content}
            onChange={(e) => {
            autoResize(e.target);
            updateBlock(block.id, { content: e.target.value });
            }}
            onInput={(e) => autoResize(e.currentTarget)}
            placeholder="Enter text..."
            className="w-full border-0 bg-transparent focus:outline-none focus:ring-0 resize-none overflow-hidden text-white"
            />

          )}

          {block.type === 'image' && (
            <div className="space-y-2">
              {block.imageUrl ? (
                <div className="space-y-2">
                  <img
                    src={block.imageUrl}
                    alt={block.alt || 'Chapter image'}
                    className="max-w-full rounded"
                  />
                  <input
                    type="text"
                    value={block.alt || ''}
                    onChange={(e) => updateBlock(block.id, { alt: e.target.value })}
                    placeholder="Image caption (optional)"
                    className="w-full px-3 py-2 border border-gray-600 rounded bg-gray-700 text-white text-sm"
                  />
                </div>
              ) : (
                <div>
                  <label className="flex flex-col items-center gap-2 p-8 border-2 border-dashed border-gray-600 rounded cursor-pointer hover:border-primary-500 dark:hover:border-primary-400">
                    <Image size={32} className="text-gray-400" />
                    <span className="text-sm text-gray-400">
                      {uploadingImage === block.id ? 'Uploading...' : 'Click to upload image'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(block.id, file);
                      }}
                      className="hidden"
                      disabled={uploadingImage === block.id}
                    />
                  </label>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2 mt-4 pt-4 border-t border-gray-700">
            <button
              type="button"
              onClick={() => addBlock('paragraph', block.id)}
              className="text-xs flex items-center gap-1 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400"
            >
              <Type size={14} />
              Text
            </button>

            <button
              type="button"
              onClick={() => addBlock('heading', block.id)}
              className="text-xs flex items-center gap-1 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400"
            >
              <Heading2 size={14} />
              Heading
            </button>

            <button
              type="button"
              onClick={() => addBlock('image', block.id)}
              className="text-xs flex items-center gap-1 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400"
            >
              <Image size={14} />
              Image
            </button>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={() => addBlock('paragraph')}
        className="w-full py-3 border-2 border-dashed border-gray-600 rounded-lg text-gray-400 hover:border-primary-500 dark:hover:border-primary-400 hover:text-primary-600 dark:hover:text-primary-400 flex items-center justify-center gap-2"
      >
        <Plus size={20} />
        Add Block
      </button>
    </div>
  );
}
