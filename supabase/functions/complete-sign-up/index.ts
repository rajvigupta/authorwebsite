// @deno-types="npm:@supabase/supabase-js@2"
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, apikey',
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders 
    });
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing environment variables');
    }
    
    // Create admin client with SERVICE ROLE (bypasses RLS completely)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Parse request body
    const body = await req.json();
    const { userId, email, fullName, securityQuestion, securityAnswerHash, role } = body;

    console.log('Signup request received for:', email);

    // Validate required fields
    if (!userId) {
      throw new Error('Missing userId');
    }
    if (!email) {
      throw new Error('Missing email');
    }
    if (!fullName) {
      throw new Error('Missing fullName');
    }
    if (!securityQuestion) {
      throw new Error('Missing securityQuestion');
    }
    if (!securityAnswerHash) {
      throw new Error('Missing securityAnswerHash');
    }
    if (!role) {
      throw new Error('Missing role');
    }

    // Verify user exists in auth.users (security check)
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId);
    
    if (authError) {
      console.error('Auth user verification failed:', authError);
      throw new Error(`Invalid user: ${authError.message}`);
    }

    if (!authUser || !authUser.user) {
      throw new Error('User not found in auth system');
    }

    console.log('Creating profile for user:', userId);

    // Create profile using SERVICE ROLE (bypasses RLS)
   const { data: profileData, error: profileError } = await supabaseAdmin
  .from('profiles')
  .insert([
    {
      id: userId,
      email: email,
      full_name: fullName,
      role: role,
      security_question: securityQuestion,
      security_answer_hash: securityAnswerHash,
      email_notifications_enabled: true, 
    },
  ])
      .select()
      .single();

    if (profileError) {
      console.error('Profile creation error:', profileError);
      throw new Error(`Failed to create profile: ${profileError.message}`);
    }

    console.log('Profile created successfully:', profileData);

    // Create author_profile if user is an author
    if (role === 'author') {
      console.log('Creating author profile...');
      
      const { error: authorProfileError } = await supabaseAdmin
        .from('author_profile')
        .insert([
          {
            user_id: userId,
            bio: '',
            custom_links: [],
          },
        ]);

      if (authorProfileError) {
        console.error('Author profile error:', authorProfileError);
        // Non-fatal error - profile was created successfully
        console.log('Continuing despite author profile error...');
      } else {
        console.log('Author profile created successfully');
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Signup completed successfully',
        userId: userId
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
        status: 200
      }
    );

  } catch (error) {
    const err = error as Error;
    console.error('Complete signup error:', err.message);
    console.error('Stack trace:', err.stack);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: err.message 
      }),
      { 
        status: 400, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});