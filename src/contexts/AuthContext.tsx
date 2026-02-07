import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase, Profile, AUTHOR_EMAIL } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

type AuthContextType = {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, securityQuestion: string, securityAnswer: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  resetPassword: (email: string, securityAnswer: string, newPassword: string) => Promise<void>;
  verifySecurityAnswer: (email: string, securityAnswer: string) => Promise<boolean>;
  getSecurityQuestion: (email: string) => Promise<string | null>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const hashSecurityAnswer = async (answer: string): Promise<string> => {
    const normalized = answer.toLowerCase().trim();
    const encoder = new TextEncoder();
    const data = encoder.encode(normalized);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const signUp = async (email: string, password: string, fullName: string, securityQuestion: string, securityAnswer: string) => {
    try {
      console.log('🔵 Step 1: Creating auth user...');
      
      // Step 1: Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) {
        console.error('❌ Auth error:', authError);
        throw authError;
      }
      
      if (!authData.user) {
        throw new Error('User creation failed - no user returned');
      }

      console.log('✅ Auth user created:', authData.user.id);

      const answerHash = await hashSecurityAnswer(securityAnswer);
      const isAuthor = email.toLowerCase() === AUTHOR_EMAIL.toLowerCase();
      const role = isAuthor ? 'author' : 'reader';

      console.log('🔵 Step 2: Calling edge function...');
      console.log('URL:', `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/complete-sign-up`);

      // Step 2: Call edge function to create profile
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/complete-sign-up`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            userId: authData.user.id,
            email: email,
            fullName: fullName,
            securityQuestion: securityQuestion,
            securityAnswerHash: answerHash,
            role: role,
          }),
        }
      );

      console.log('🔵 Response status:', response.status);
      console.log('🔵 Response ok:', response.ok);

      // Check if response is ok before parsing JSON
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Edge function HTTP error:', errorText);
        throw new Error(`Edge function failed: ${response.status} ${errorText}`);
      }

      let result;
      try {
        result = await response.json();
        console.log('🔵 Response body:', result);
      } catch (parseError) {
        console.error('❌ Failed to parse response:', parseError);
        throw new Error('Invalid response from edge function');
      }

      if (!result.success) {
        console.error('❌ Edge function returned error:', result.error);
        throw new Error(result.error || 'Failed to complete signup');
      }

      console.log('✅ Profile created successfully');
      console.log('🔵 Step 3: Fetching profile...');

      // Profile created successfully, now fetch it
      await fetchProfile(authData.user.id);
      
      console.log('✅ Signup complete!');

    } catch (error: any) {
      console.error('❌ SignUp error:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
      });
      throw error;
    }
  };

  const getSecurityQuestion = async (email: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('security_question')
        .eq('email', email)
        .maybeSingle();

      if (error) throw error;
      return data?.security_question || null;
    } catch (error) {
      console.error('Error fetching security question:', error);
      return null;
    }
  };

  const verifySecurityAnswer = async (email: string, securityAnswer: string): Promise<boolean> => {
    try {
      const answerHash = await hashSecurityAnswer(securityAnswer);

      const { data, error } = await supabase.rpc('verify_security_answer', {
        user_email: email,
        answer_hash: answerHash,
      });

      if (error) throw error;
      return data as boolean;
    } catch (error) {
      console.error('Error verifying security answer:', error);
      return false;
    }
  };

  const resetPassword = async (email: string, securityAnswer: string, newPassword: string) => {
    try {
      const isValid = await verifySecurityAnswer(email, securityAnswer);

      if (!isValid) {
        throw new Error('Incorrect security answer');
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profileData) throw new Error('User not found');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reset-password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            userId: profileData.id,
            newPassword: newPassword
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Password reset failed');
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Password reset failed');
      }
    } catch (error: any) {
      console.error('Password reset error:', error);
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
  };

const signOut = async () => {
  try {
    await supabase.auth.signOut();
  } catch (error) {
    console.warn('Supabase signOut failed, clearing local state anyway:', error);
  } finally {
    setUser(null);
    setProfile(null);
  }
};

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      loading, 
      signUp, 
      signIn, 
      resetPassword, 
      verifySecurityAnswer, 
      getSecurityQuestion, 
      signOut 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}