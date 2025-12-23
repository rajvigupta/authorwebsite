// @deno-types="npm:@supabase/supabase-js@2"
import { createClient } from 'npm:@supabase/supabase-js@2';
import { createHmac } from 'node:crypto';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET')!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const body = await req.json();
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, chapterId } = body;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !chapterId) {
      throw new Error('Missing required fields');
    }

    const bodyStr = razorpayOrderId + '|' + razorpayPaymentId;
    const expectedSignature = createHmac('sha256', razorpayKeySecret)
      .update(bodyStr)
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      await supabase
        .from('purchases')
        .update({ payment_status: 'failed' })
        .eq('razorpay_order_id', razorpayOrderId)
        .eq('user_id', user.id);

      throw new Error('Invalid payment signature');
    }

    const { error: updateError } = await supabase
      .from('purchases')
      .update({
        payment_status: 'completed',
        razorpay_payment_id: razorpayPaymentId,
      })
      .eq('razorpay_order_id', razorpayOrderId)
      .eq('user_id', user.id)
      .eq('chapter_id', chapterId);

    if (updateError) {
      throw updateError;
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    const err = error as Error;
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});