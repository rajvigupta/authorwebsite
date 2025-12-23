import { useState, useEffect } from 'react';
import { Camera, Link as LinkIcon, Edit2, Save, Plus, Trash2, ExternalLink, AlertCircle } from 'lucide-react';
import { supabase, AuthorProfile, Profile, CustomLink } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

type AuthorProfileSectionProps = {
  authorUser: Profile;
  canEdit: boolean;
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export function AuthorProfileSection({ authorUser, canEdit }: AuthorProfileSectionProps) {
  const [authorProfile, setAuthorProfile] = useState<AuthorProfile | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    bio: '',
    custom_links: [] as CustomLink[],
  });
  const { profile } = useAuth();

  useEffect(() => {
    fetchAuthorProfile();
  }, [authorUser.id]);

  const fetchAuthorProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('author_profile')
        .select('*')
        .eq('user_id', authorUser.id)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setAuthorProfile(data);
        setFormData({
          bio: data.bio || '',
          custom_links: data.custom_links || [],
        });
      }
    } catch (error) {
      console.error('Error fetching author profile:', error);
      setError('Failed to load profile');
    }
  };

  const validateImageFile = (file: File): string | null => {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return `File size too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`;
    }

    // Check file type
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return 'Invalid file type. Please upload a JPEG, PNG, or WebP image';
    }

    return null;
  };

  const handleSave = async () => {
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('author_profile')
        .update({
          bio: formData.bio,
          custom_links: formData.custom_links,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', authorUser.id);

      if (error) throw error;
      await fetchAuthorProfile();
      setEditing(false);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      setError(error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

 // In AuthorProfileSection.tsx, replace the handleProfilePictureUpload function:

const handleProfilePictureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  // Validate file
  const validationError = validateImageFile(file);
  if (validationError) {
    setError(validationError);
    return;
  }

  setLoading(true);
  setError(null);

  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    
    // ✅ FIXED: Use folder structure that matches RLS policy
    const filePath = `${profile?.id}/${fileName}`;  // Changed from just fileName

    console.log('Uploading to path:', filePath);

    // Upload to storage
    const { error: uploadError, data: uploadData } = await supabase.storage
      .from('profile-pictures')
      .upload(filePath, file, { 
        upsert: true,
        contentType: file.type 
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }
    
    if (!uploadData) throw new Error('Upload failed - no data returned');

    console.log('Upload successful:', uploadData);

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('profile-pictures')
      .getPublicUrl(filePath);

    if (!urlData || !urlData.publicUrl) {
      throw new Error('Failed to get public URL');
    }

    console.log('Public URL:', urlData.publicUrl);

    // Update profile with new URL
    const { error: updateError } = await supabase
      .from('author_profile')
      .update({ 
        profile_picture_url: urlData.publicUrl,
        updated_at: new Date().toISOString() 
      })
      .eq('user_id', authorUser.id);

    if (updateError) {
      console.error('Update error:', updateError);
      throw updateError;
    }
    
    await fetchAuthorProfile();
    console.log('Profile picture updated successfully!');
    
  } catch (error: any) {
    console.error('Error uploading profile picture:', error);
    setError(error.message || 'Failed to upload profile picture');
  } finally {
    setLoading(false);
  }
};

  const addLink = () => {
    setFormData({
      ...formData,
      custom_links: [...formData.custom_links, { label: '', url: '' }],
    });
  };

  const updateLink = (index: number, field: 'label' | 'url', value: string) => {
    const newLinks = [...formData.custom_links];
    newLinks[index][field] = value;
    setFormData({ ...formData, custom_links: newLinks });
  };

  const removeLink = (index: number) => {
    const newLinks = formData.custom_links.filter((_, i) => i !== index);
    setFormData({ ...formData, custom_links: newLinks });
  };

  const validateURL = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleSaveWithValidation = () => {
    // Validate custom links
    for (let i = 0; i < formData.custom_links.length; i++) {
      const link = formData.custom_links[i];
      
      if (!link.label.trim()) {
        setError(`Link ${i + 1}: Label is required`);
        return;
      }

      if (!link.url.trim()) {
        setError(`Link ${i + 1}: URL is required`);
        return;
      }

      if (!validateURL(link.url)) {
        setError(`Link ${i + 1}: Invalid URL format`);
        return;
      }
    }

    handleSave();
  };

  return (
    <div className="relative gothic-card rounded-lg shadow-gothic p-8 overflow-hidden">
      {/* Corner ornaments */}
      <div className="corner-ornament corner-ornament-tl"></div>
      <div className="corner-ornament corner-ornament-tr"></div>
      <div className="corner-ornament corner-ornament-bl"></div>
      <div className="corner-ornament corner-ornament-br"></div>

      {/* Decorative top border */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent opacity-50"></div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-4 bg-red-900/20 border border-red-500/50 rounded-lg flex items-start gap-2">
          <AlertCircle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-200 text-sm font-semibold">Error</p>
            <p className="text-red-300 text-sm">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-400 hover:text-red-300"
          >
            ✕
          </button>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-8 items-center md:items-start relative z-10">
        {/* Profile Picture */}
        <div className="relative group">
          <div className="absolute -inset-4 border-2 border-accent-maroon/30 rounded-full"></div>
          <div className="absolute -inset-2 border border-primary/20 rounded-full"></div>
          
          {authorProfile?.profile_picture_url ? (
            <img
              src={authorProfile.profile_picture_url}
              alt={authorUser.full_name}
              className="w-40 h-40 rounded-full object-cover border-4 border-gothic-dark shadow-gold relative z-10"
            />
          ) : (
            <div className="w-40 h-40 rounded-full bg-gradient-to-br from-gothic-mid to-gothic-dark flex items-center justify-center border-4 border-gothic-dark shadow-gold relative z-10">
              <span className="text-6xl font-cinzel font-bold text-primary">
                {authorUser.full_name?.charAt(0) || 'A'}
              </span>
            </div>
          )}
          
          {canEdit && (
            <label className="absolute bottom-2 right-2 bg-primary text-gothic-darkest p-3 rounded-full cursor-pointer hover:bg-primary-light transition-all shadow-gold-glow z-20 group-hover:scale-110">
              <Camera size={20} />
              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleProfilePictureUpload}
                className="hidden"
                disabled={loading}
              />
            </label>
          )}
        </div>

        {/* Profile Content */}
        <div className="flex-1 text-center md:text-left">
          <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-4 mb-6">
            <div>
              <h2 className="text-4xl font-cinzel font-bold text-primary mb-2 text-gold-glow">
                {authorUser.full_name}
              </h2>
              <div className="h-px w-32 mx-auto md:mx-0 bg-gradient-to-r from-accent-maroon via-primary to-accent-maroon opacity-50"></div>
            </div>
            
            {canEdit && !editing && (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg transition-all border border-primary/30 font-cinzel text-sm"
              >
                <Edit2 size={18} />
                Edit Profile
              </button>
            )}
          </div>

          {editing ? (
            <div className="space-y-6">
              {/* Bio Editor */}
              <div>
                <label className="block text-sm font-cinzel text-primary mb-2">
                  Bio
                </label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  className="w-full px-4 py-3 bg-gothic-mid border border-accent-maroon/30 rounded-lg text-text-light font-lora focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all"
                  rows={4}
                  placeholder="Tell readers about yourself..."
                  maxLength={500}
                />
                <p className="text-xs text-text-muted mt-1">
                  {formData.bio.length}/500 characters
                </p>
              </div>

              {/* Custom Links Editor */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-cinzel text-primary">
                    Links
                  </label>
                  <button
                    onClick={addLink}
                    className="flex items-center gap-2 px-3 py-1 bg-green-600/20 text-green-400 hover:bg-green-600/30 rounded-lg transition-all text-sm font-lora"
                  >
                    <Plus size={16} />
                    Add Link
                  </button>
                </div>

                <div className="space-y-3">
                  {formData.custom_links.map((link, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={link.label}
                        onChange={(e) => updateLink(index, 'label', e.target.value)}
                        placeholder="Label (e.g., Instagram)"
                        className="w-1/3 px-3 py-2 bg-gothic-mid border border-accent-maroon/30 rounded-lg text-text-light font-lora text-sm focus:border-primary focus:ring-1 focus:ring-primary/50"
                        maxLength={30}
                      />
                      <input
                        type="url"
                        value={link.url}
                        onChange={(e) => updateLink(index, 'url', e.target.value)}
                        placeholder="https://..."
                        className="flex-1 px-3 py-2 bg-gothic-mid border border-accent-maroon/30 rounded-lg text-text-light font-lora text-sm focus:border-primary focus:ring-1 focus:ring-primary/50"
                      />
                      <button
                        onClick={() => removeLink(index)}
                        className="p-2 text-red-400 hover:bg-red-600/20 rounded-lg transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}

                  {formData.custom_links.length === 0 && (
                    <p className="text-sm text-text-muted italic font-lora">
                      No links added yet. Click "Add Link" to add your social media, website, or any other links.
                    </p>
                  )}
                </div>
              </div>

              {/* Save/Cancel Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleSaveWithValidation}
                  disabled={loading}
                  className="flex items-center gap-2 btn-gold px-6 py-2 rounded-lg font-semibold disabled:opacity-50 transition-all"
                >
                  <Save size={18} />
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={() => {
                    setEditing(false);
                    setError(null);
                    if (authorProfile) {
                      setFormData({
                        bio: authorProfile.bio || '',
                        custom_links: authorProfile.custom_links || [],
                      });
                    }
                  }}
                  disabled={loading}
                  className="px-6 py-2 bg-accent-maroon/20 text-text-light hover:bg-accent-maroon/30 rounded-lg transition-all border border-accent-maroon/30 font-cinzel disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Bio Display */}
              <div className="mb-6">
                <p className="text-text-light font-cormorant italic text-lg leading-relaxed whitespace-pre-wrap">
                  {authorProfile?.bio || 'No bio yet...'}
                </p>
              </div>

              {/* Links Display */}
              {authorProfile?.custom_links && authorProfile.custom_links.length > 0 && (
                <>
                  <div className="ornamental-divider my-6"></div>
                  
                  <div className="flex flex-wrap justify-center md:justify-start gap-3">
                    {authorProfile.custom_links.map((link, index) => (
                      <a
                        key={index}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center gap-2 px-4 py-2 bg-gothic-mid hover:bg-primary/10 rounded-lg border border-accent-maroon/30 hover:border-primary transition-all"
                      >
                        <LinkIcon
                          size={18}
                          className="text-text-muted group-hover:text-primary transition-colors" 
                        />
                        <span className="text-sm font-lora text-text-light group-hover:text-primary transition-colors">
                          {link.label}
                        </span>
                        <ExternalLink
                          size={14} 
                          className="text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" 
                        />
                      </a>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Decorative bottom border */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent opacity-50"></div>
    </div>
  );
}