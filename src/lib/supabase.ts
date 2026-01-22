import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const AUTHOR_EMAIL = 'rajvigupta04@gmail.com';

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  role: 'author' | 'reader';
  security_question?: string;
  security_answer_hash?: string;
  created_at: string;
  updated_at: string;
};

export type CustomLink = {
  label: string;
  url: string;
};

export type AuthorProfile = {
  id: string;
  user_id: string;
  bio: string;
  profile_picture_url: string | null;
  custom_links: CustomLink[] | null;
  created_at: string;
  updated_at: string;
};

export type Book = {
  id: string;
  title: string;
  description: string;
  cover_image_url: string | null;
  author_note: string | null;
  price: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

// Fixed: ContentBlock is the individual block type
export type ContentBlock = {
  id: string;
  type: 'heading' | 'paragraph' | 'image';
  content: string;
  level?: number;
  imageUrl?: string;
  alt?: string;
};

// RichContent is an array of ContentBlocks
export type RichContent = ContentBlock[];

export type Chapter = {
  id: string;
  book_id: string | null;
  title: string;
  description: string;
  price: number;
  is_free: boolean;
  pdf_url: string | null;
  cover_image_url: string | null;
  chapter_number: number;
  content_type: 'pdf' | 'text';
  rich_content: RichContent | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

export type Purchase = {
  id: string;
  user_id: string;
  chapter_id: string;
  amount_paid: number;
  razorpay_payment_id: string | null;
  razorpay_order_id: string;
  payment_status: 'pending' | 'completed' | 'failed';
  purchased_at: string;
};

export type Comment = {
  id: string;
  book_id: string | null;
  chapter_id: string | null;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
};

export type Vote = {
  id: string;
  book_id: string | null;
  chapter_id: string | null;
  user_id: string;
  created_at: string;
};