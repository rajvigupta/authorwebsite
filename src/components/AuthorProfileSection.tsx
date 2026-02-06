import { useState, useEffect } from 'react';
import { Camera, Link as LinkIcon, Edit2, Save, Plus, Trash2, ExternalLink, AlertCircle, User } from 'lucide-react';
import { supabase, AuthorProfile, Profile, CustomLink } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './Toast';

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
  
  // ✅ NEW: Add full_name to formData
  const [formData, setFormData] = useState({
    full_name: '',
    bio: '',
    custom_links: [] as CustomLink[],
  });
  
  const { profile } = useAuth();
  const toast = useToast();

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
          full_name: authorUser.full_name, // ✅ Load current name
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
    if (file.size > MAX_FILE_SIZE) {
      return `File size too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`;
    }
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return 'Invalid file type. Please upload a JPEG, PNG, or WebP image';
    }
    return null;
  };

  // ✅ FIXED: Save both profile and author_profile
  const handleSave = async () => {
    setLoading(true);
    setError(null);

    try {
      // Update profiles table (full_name)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', authorUser.id);

      if (profileError) throw profileError;

      // Update author_profile table (bio, links)
      const { error: authorProfileError } = await supabase
        .from('author_profile')
        .update({
          bio: formData.bio,
          custom_links: formData.custom_links,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', authorUser.id);

      if (authorProfileError) throw authorProfileError;

      toast.success('✏️ Profile updated successfully!');
      await fetchAuthorProfile();
      setEditing(false);
      
      // ✅ Reload the page to reflect name change everywhere
      window.location.reload();
    } catch (error: any) {
      console.error('Error updating profile:', error);
      setError(error.message || 'Failed to update profile');
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleProfilePictureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validationError = validateImageFile(file);
    if (validationError) {
      setError(validationError);
      toast.error(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${profile?.id}/${fileName}`;

      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('profile-pictures')
        .upload(filePath, file, { 
          upsert: true,
          contentType: file.type 
        });

      if (uploadError) throw uploadError;
      if (!uploadData) throw new Error('Upload failed - no data returned');

      const { data: urlData } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(filePath);

      if (!urlData || !urlData.publicUrl) {
        throw new Error('Failed to get public URL');
      }

      const { error: updateError } = await supabase
        .from('author_profile')
        .update({ 
          profile_picture_url: urlData.publicUrl,
          updated_at: new Date().toISOString() 
        })
        .eq('user_id', authorUser.id);

      if (updateError) throw updateError;
      
      toast.success('📷 Profile picture updated!');
      await fetchAuthorProfile();
    } catch (error: any) {
      console.error('Error uploading profile picture:', error);
      setError(error.message || 'Failed to upload profile picture');
      toast.error(error.message || 'Failed to upload profile picture');
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
    // Validate name
    if (!formData.full_name.trim()) {
      setError('Name cannot be empty');
      toast.error('Name cannot be empty');
      return;
    }

    // Validate custom links
    for (let i = 0; i < formData.custom_links.length; i++) {
      const link = formData.custom_links[i];
      
      if (!link.label.trim()) {
        setError(`Link ${i + 1}: Label is required`);
        toast.error(`Link ${i + 1}: Label is required`);
        return;
      }

      if (!link.url.trim()) {
        setError(`Link ${i + 1}: URL is required`);
        toast.error(`Link ${i + 1}: URL is required`);
        return;
      }

      if (!validateURL(link.url)) {
        setError(`Link ${i + 1}: Invalid URL format`);
        toast.error(`Link ${i + 1}: Invalid URL format`);
        return;
      }
    }

    handleSave();
  };

  return (
    <div className="relative gothic-card rounded-lg shadow-gothic p-8 overflow-hidden">
      <div className="corner-ornament corner-ornament-tl"></div>
      <div className="corner-ornament corner-ornament-tr"></div>
      <div className="corner-ornament corner-ornament-bl"></div>
      <div className="corner-ornament corner-ornament-br"></div>
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent opacity-50"></div>
       
{/* Error Display - Mobile Responsive */}
      {error && (
        <div className="mb-3 md:mb-4 p-3 md:p-4 bg-red-900/20 border border-red-500/50 rounded-lg flex items-start gap-2">
          <AlertCircle size={16} className="md:w-5 md:h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-red-200 text-xs md:text-sm font-semibold">Error</p>
            <p className="text-red-300 text-xs md:text-sm break-words">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-400 hover:text-red-300 flex-shrink-0"
          >
            ✕
          </button>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-center md:items-start relative z-10">
        {/* Profile Picture - Mobile Responsive */}
        <div className="relative group flex-shrink-0">
          <div className="absolute -inset-3 md:-inset-4 border-2 border-accent-maroon/30 rounded-full"></div>
          <div className="absolute -inset-1.5 md:-inset-2 border border-primary/20 rounded-full"></div>
          
          {authorProfile?.profile_picture_url ? (
            <img
              src={authorProfile.profile_picture_url}
              alt={formData.full_name}
              className="w-32 h-32 md:w-40 md:h-40 rounded-full object-cover border-4 border-gothic-dark shadow-gold relative z-10"
            />
          ) : (
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-gradient-to-br from-gothic-mid to-gothic-dark flex items-center justify-center border-4 border-gothic-dark shadow-gold relative z-10">
              <span className="text-5xl md:text-6xl font-cinzel font-bold text-primary">
                {formData.full_name?.charAt(0) || 'A'}
              </span>
            </div>
          )}
          
          {canEdit && (
            <label className="absolute bottom-1 right-1 md:bottom-2 md:right-2 bg-primary text-gothic-darkest p-2 md:p-3 rounded-full cursor-pointer hover:bg-primary-light transition-all shadow-gold-glow z-20 group-hover:scale-110">
              <Camera size={16} className="md:w-5 md:h-5" />
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

        {/* Profile Content - Mobile Responsive */}
        <div className="flex-1 w-full text-center md:text-left">
          <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-3 md:gap-4 mb-4 md:mb-6">
            <div className="w-full md:w-auto">
              {/* Name Section - Mobile Responsive */}
              {editing ? (
                <div className="mb-2">
                  <label className="block text-xs font-cinzel text-primary mb-1.5">
                    Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2 md:pl-3 flex items-center pointer-events-none">
                      <User size={14} className="md:w-4 md:h-4 text-primary" />
                    </div>
                    <input
                      type="text"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      className="w-full pl-8 md:pl-10 pr-3 py-2 bg-gothic-mid border border-accent-maroon/30 rounded-lg text-primary font-cinzel text-xl md:text-2xl font-bold focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all"
                      placeholder="Your Name"
                      maxLength={50}
                    />
                  </div>
                </div>
              ) : (
                <h2 className="text-2xl md:text-4xl font-cinzel font-bold text-primary mb-2 text-gold-glow break-words">
                  {formData.full_name || authorUser.full_name}
                </h2>
              )}
              <div className="h-px w-24 md:w-32 mx-auto md:mx-0 bg-gradient-to-r from-accent-maroon via-primary to-accent-maroon opacity-50"></div>
            </div>
            
            {canEdit && !editing && (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-2 px-3 md:px-4 py-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg transition-all border border-primary/30 font-cinzel text-xs md:text-sm w-full md:w-auto justify-center"
              >
                <Edit2 size={16} className="md:w-[18px] md:h-[18px]" />
                Edit Profile
              </button>
            )}
          </div>

          {editing ? (
            <div className="space-y-4 md:space-y-6">
              {/* Bio Editor - Mobile Responsive */}
              <div>
                <label className="block text-xs md:text-sm font-cinzel text-primary mb-2">
                  Bio
                </label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  className="w-full px-3 md:px-4 py-2 md:py-3 bg-gothic-mid border border-accent-maroon/30 rounded-lg text-text-light font-lora text-sm md:text-base focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all"
                  rows={4}
                  placeholder="Tell readers about yourself..."
                  maxLength={500}
                />
                <p className="text-xs text-text-muted mt-1">
                  {formData.bio.length}/500 characters
                </p>
              </div>

              {/* Custom Links Editor - Fully Mobile Responsive */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                  <label className="block text-xs md:text-sm font-cinzel text-primary">
                    Links
                  </label>
                  <button
                    type="button"
                    onClick={addLink}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-green-600/20 text-green-400 hover:bg-green-600/30 rounded-lg transition-all text-xs md:text-sm font-lora"
                  >
                    <Plus size={14} className="md:w-4 md:h-4" />
                    Add Link
                  </button>
                </div>

                <div className="space-y-3">
                  {formData.custom_links.map((link, index) => (
                    <div key={index} className="space-y-2">
                      {/* Label Input - Full width on mobile */}
                      <div className="w-full">
                        <input
                          type="text"
                          value={link.label}
                          onChange={(e) => updateLink(index, 'label', e.target.value)}
                          placeholder="Label (e.g., Instagram)"
                          className="w-full px-3 py-2 bg-gothic-mid border border-accent-maroon/30 rounded-lg text-text-light font-lora text-sm focus:border-primary focus:ring-1 focus:ring-primary/50"
                          maxLength={30}
                        />
                      </div>
                      
                      {/* URL Input + Delete Button - Full width on mobile */}
                      <div className="flex gap-2 w-full">
                        <input
                          type="url"
                          value={link.url}
                          onChange={(e) => updateLink(index, 'url', e.target.value)}
                          placeholder="https://..."
                          className="flex-1 px-3 py-2 bg-gothic-mid border border-accent-maroon/30 rounded-lg text-text-light font-lora text-sm focus:border-primary focus:ring-1 focus:ring-primary/50"
                        />
                        <button
                          type="button"
                          onClick={() => removeLink(index)}
                          className="p-2 text-red-400 hover:bg-red-600/20 rounded-lg transition-all flex-shrink-0"
                          aria-label="Remove link"
                        >
                          <Trash2 size={16} className="md:w-[18px] md:h-[18px]" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {formData.custom_links.length === 0 && (
                    <p className="text-xs md:text-sm text-text-muted italic font-lora">
                      No links added yet. Click "Add Link" to add your social media, website, or any other links.
                    </p>
                  )}
                </div>
              </div>

              {/* Save/Cancel Buttons - Mobile Responsive */}
              <div className="flex flex-col sm:flex-row gap-2 md:gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleSaveWithValidation}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 btn-gold px-4 md:px-6 py-2 md:py-2.5 rounded-lg font-semibold disabled:opacity-50 transition-all text-sm md:text-base"
                >
                  <Save size={16} className="md:w-[18px] md:h-[18px]" />
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setError(null);
                    if (authorProfile) {
                      setFormData({
                        full_name: authorUser.full_name,
                        bio: authorProfile.bio || '',
                        custom_links: authorProfile.custom_links || [],
                      });
                    }
                  }}
                  disabled={loading}
                  className="px-4 md:px-6 py-2 md:py-2.5 bg-accent-maroon/20 text-text-light hover:bg-accent-maroon/30 rounded-lg transition-all border border-accent-maroon/30 font-cinzel disabled:opacity-50 text-sm md:text-base"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Bio Display - Mobile Responsive */}
              <div className="mb-4 md:mb-6">
                <p className="text-text-light font-cormorant italic text-base md:text-lg leading-relaxed whitespace-pre-wrap break-words">
                  {authorProfile?.bio || 'No bio yet...'}
                </p>
              </div>

              {/* Links Display - Mobile Responsive */}
              {authorProfile?.custom_links && authorProfile.custom_links.length > 0 && (
                <>
                  <div className="ornamental-divider my-4 md:my-6"></div>
                  
                  <div className="flex flex-wrap justify-center md:justify-start gap-2 md:gap-3">
                    {authorProfile.custom_links.map((link, index) => (
                      <a
                        key={index}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 bg-gothic-mid hover:bg-primary/10 rounded-lg border border-accent-maroon/30 hover:border-primary transition-all"
                      >
                        <LinkIcon
                          size={14}
                          className="md:w-[18px] md:h-[18px] text-text-muted group-hover:text-primary transition-colors" 
                        />
                        <span className="text-xs md:text-sm font-lora text-text-light group-hover:text-primary transition-colors break-all">
                          {link.label}
                        </span>
                        <ExternalLink
                          size={12}
                          className="md:w-[14px] md:h-[14px] text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" 
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





