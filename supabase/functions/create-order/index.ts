import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ───────────────── ENV ─────────────────
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const RAZORPAY_KEY_ID = Deno.env.get('RAZORPAY_KEY_ID')!;
    const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET')!;

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // ───────────── AUTH USER ─────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing Authorization header');

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) throw new Error('Unauthorized');

    // ───────────── REQUEST BODY ─────────────
    const { chapterId, amount } = await req.json();
    if (!chapterId || !amount) {
      throw new Error('Missing chapterId or amount');
    }

    // ✅ CHECK FOR EXISTING COMPLETED PURCHASE
    const { data: existingPurchase } = await supabase
      .from('purchases')
      .select('id, payment_status')
      .eq('user_id', user.id)
      .eq('chapter_id', chapterId)
      .eq('payment_status', 'completed')
      .maybeSingle();

    if (existingPurchase) {
      return new Response(
        JSON.stringify({ 
          error: 'Chapter already purchased',
          alreadyOwned: true 
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // ───────────── VERIFY CHAPTER EXISTS ─────────────
    const { data: chapter } = await supabase
      .from('chapters')
      .select('id, price')
      .eq('id', chapterId)
      .single();

    if (!chapter) throw new Error('Chapter not found');

    // ✅ DELETE ANY PENDING/FAILED PURCHASES FOR THIS CHAPTER
    await supabase
      .from('purchases')
      .delete()
      .eq('user_id', user.id)
      .eq('chapter_id', chapterId)
      .in('payment_status', ['pending', 'failed']);

    // ───────────── CREATE RAZORPAY ORDER ─────────────
    const authString = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);

    const razorpayResponse = await fetch(
      'https://api.razorpay.com/v1/orders',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${authString}`,
        },
        body: JSON.stringify({
          amount: Math.round(amount * 100), // INR → paise
          currency: 'INR',
          receipt: `ch_${chapterId.slice(0, 8)}_${Date.now()}`, // ✅ Add timestamp for uniqueness
        }),
      }
    );

    if (!razorpayResponse.ok) {
      const errText = await razorpayResponse.text();
      console.error('Razorpay error:', errText);
      throw new Error('Failed to create Razorpay order');
    }

    const order = await razorpayResponse.json();

    // ───────────── SAVE PURCHASE (PENDING) ─────────────
    const { error: insertError } = await supabase
      .from('purchases')
      .insert({
        user_id: user.id,
        chapter_id: chapterId,
        amount_paid: amount,
        razorpay_order_id: order.id,
        payment_status: 'pending',
      });

    if (insertError) {
      console.error('Insert error:', insertError);
      throw new Error(`Failed to create purchase record: ${insertError.message}`);
    }

    return new Response(
      JSON.stringify({
        orderId: order.id,
        key: RAZORPAY_KEY_ID,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (err) {
    console.error('Create order error:', err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
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