// @deno-types="npm:@supabase/supabase-js@2"
import { createClient } from 'npm:@supabase/supabase-js@2';

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
    const { chapterIds, totalAmount, bookId } = body;

    if (!chapterIds || !Array.isArray(chapterIds) || chapterIds.length === 0) {
      throw new Error('Invalid chapter IDs');
    }

    if (!totalAmount || totalAmount <= 0) {
      throw new Error('Invalid amount');
    }

    // ✅ CHECK FOR EXISTING PURCHASES
    const { data: existingPurchases } = await supabase
      .from('purchases')
      .select('chapter_id')
      .eq('user_id', user.id)
      .in('chapter_id', chapterIds)
      .eq('payment_status', 'completed');

    if (existingPurchases && existingPurchases.length > 0) {
      const alreadyOwnedIds = existingPurchases.map(p => p.chapter_id);
      return new Response(
        JSON.stringify({ 
          error: 'Some chapters are already purchased',
          alreadyOwnedIds,
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

    // Verify all chapters exist and belong to the book
    const { data: chapters, error: chaptersError } = await supabase
      .from('chapters')
      .select('id, price, book_id')
      .in('id', chapterIds);

    if (chaptersError || !chapters || chapters.length !== chapterIds.length) {
      throw new Error('Some chapters not found');
    }

    // Verify all chapters belong to the specified book
    const invalidChapters = chapters.filter((ch: any) => ch.book_id !== bookId);
    if (invalidChapters.length > 0) {
      throw new Error('Some chapters do not belong to this book');
    }

    // Verify total amount matches
    const calculatedTotal = chapters.reduce((sum: number, ch: any) => sum + ch.price, 0);
    if (Math.abs(calculatedTotal - totalAmount) > 0.01) {
      throw new Error(`Amount mismatch: expected ${calculatedTotal}, got ${totalAmount}`);
    }

    // ✅ DELETE ANY PENDING/FAILED BULK PURCHASES FOR THESE CHAPTERS
    await supabase
      .from('purchases')
      .delete()
      .eq('user_id', user.id)
      .in('chapter_id', chapterIds)
      .in('payment_status', ['pending', 'failed']);

    // Create Razorpay order
    const authString = btoa(`${razorpayKeyId}:${razorpayKeySecret}`);

    const razorpayResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`,
      },
      body: JSON.stringify({
        amount: Math.round(totalAmount * 100),
        currency: 'INR',
        receipt: `bulk_${bookId.slice(0, 8)}_${Date.now()}`, // ✅ Add timestamp
      }),
    });

    if (!razorpayResponse.ok) {
      const errText = await razorpayResponse.text();
      console.error('Razorpay error:', errText);
      throw new Error('Failed to create Razorpay order');
    }

    const order = await razorpayResponse.json();

    // Insert pending purchases for all chapters
    const purchaseRecords = chapterIds.map((chapterId: string) => {
      const chapter = chapters.find((ch: any) => ch.id === chapterId)!;
      return {
        user_id: user.id,
        chapter_id: chapterId,
        amount_paid: chapter.price,
        razorpay_order_id: order.id,
        payment_status: 'pending',
      };
    });

    const { error: insertError } = await supabase
      .from('purchases')
      .insert(purchaseRecords);

    if (insertError) {
      console.error('Insert error:', insertError);
      throw new Error(`Failed to create purchase records: ${insertError.message}`);
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
    console.error('Error creating bulk order:', err);
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