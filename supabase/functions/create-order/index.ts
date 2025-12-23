// @deno-types="npm:@supabase/supabase-js@2"
import { createClient } from 'npm:@supabase/supabase-js@2';
// @deno-types="npm:razorpay@2"
import Razorpay from 'npm:razorpay@2';

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
    const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID')!;
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
    const { chapterId, amount } = body;

    if (!chapterId || !amount) {
      throw new Error('Missing required fields');
    }

    const { data: chapter, error: chapterError } = await supabase
      .from('chapters')
      .select('*')
      .eq('id', chapterId)
      .single();

    if (chapterError || !chapter) {
      throw new Error('Chapter not found');
    }

    const { data: existingPurchase } = await supabase
      .from('purchases')
      .select('*')
      .eq('user_id', user.id)
      .eq('chapter_id', chapterId)
      .eq('payment_status', 'completed')
      .maybeSingle();

    if (existingPurchase) {
      throw new Error('Chapter already purchased');
    }

    const razorpay = new Razorpay({
      key_id: razorpayKeyId,
      key_secret: razorpayKeySecret,
    });

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency: 'INR',
      receipt: `receipt_${chapterId}_${user.id}`,
    });

    const { error: insertError } = await supabase.from('purchases').insert([
      {
        user_id: user.id,
        chapter_id: chapterId,
        amount_paid: amount,
        razorpay_order_id: order.id,
        payment_status: 'pending',
      },
    ]);

    if (insertError) {
      throw insertError;
    }

    return new Response(
      JSON.stringify({ orderId: order.id }),
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
      JSON.stringify({ error: err.message }),
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