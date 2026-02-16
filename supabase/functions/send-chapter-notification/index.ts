// ============================================================================
// SUPABASE EDGE FUNCTION: send-chapter-notification (BREVO VERSION)
// ============================================================================
// Path: supabase/functions/send-chapter-notification/index.ts
// 100% FREE - NO DOMAIN NEEDED - WORKS WITH BREVO FREE TIER
// ============================================================================

// @deno-types="npm:@supabase/supabase-js@2"
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, apikey',
};

interface NotificationPayload {
  chapterId: string;
  chapterTitle: string;
  chapterNumber: number;
  bookId?: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders 
    });
  }

  try {
    // ═══════════════════════════════════════════════════════════
    // STEP 1: Environment Variables & Setup
    // ═══════════════════════════════════════════════════════════
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const brevoApiKey = Deno.env.get('BREVO_API_KEY'); // Get from brevo.com
    const siteUrl = Deno.env.get('SITE_URL') || 'https://memorycraver.vercel.app';

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    if (!brevoApiKey) {
      throw new Error('Missing BREVO_API_KEY environment variable');
    }

    // Create admin Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // ═══════════════════════════════════════════════════════════
    // STEP 2: Parse Request & Validate
    // ═══════════════════════════════════════════════════════════
    
    const payload: NotificationPayload = await req.json();
    const { chapterId, chapterTitle, chapterNumber, bookId } = payload;

    console.log('📧 Processing notification for chapter:', chapterTitle);

    if (!chapterId || !chapterTitle) {
      throw new Error('Missing required fields: chapterId, chapterTitle');
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 3: Get Chapter Details
    // ═══════════════════════════════════════════════════════════
    
    const { data: chapter, error: chapterError } = await supabase
      .from('chapters')
      .select(`
        id,
        title,
        description,
        chapter_number,
        is_free,
        price,
        book_id,
        books (
          id,
          title,
          description
        )
      `)
      .eq('id', chapterId)
      .single();

    if (chapterError || !chapter) {
      throw new Error(`Chapter not found: ${chapterError?.message}`);
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 4: Get Recipients (Users with notifications enabled)
    // ═══════════════════════════════════════════════════════════
    
    const { data: recipients, error: recipientsError } = await supabase
      .rpc('get_notification_recipients', { chapter_uuid: chapterId });

    if (recipientsError) {
      console.error('Error fetching recipients:', recipientsError);
      throw recipientsError;
    }

    if (!recipients || recipients.length === 0) {
      console.log('ℹ️ No recipients to notify');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No recipients to notify',
          sent: 0 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`📨 Sending to ${recipients.length} recipients`);

    // ═══════════════════════════════════════════════════════════
    // STEP 5: Prepare Email Content
    // ═══════════════════════════════════════════════════════════
    
    const bookTitle = chapter.books?.title || 'Standalone Chapter';
    const chapterUrl = bookId 
      ? `${siteUrl}/book/${bookId}/chapter/${chapter.chapter_number}`
      : `${siteUrl}/chapter/${chapterId}`;
    
    const priceInfo = chapter.is_free 
      ? '✨ <strong>FREE to read!</strong>' 
      : `💰 Price: ₹${chapter.price}`;

    // ═══════════════════════════════════════════════════════════
    // STEP 6: Send Emails via Brevo API
    // ═══════════════════════════════════════════════════════════
    
    let successCount = 0;
    let failureCount = 0;

    // Brevo allows batch sending (up to 500 recipients per request)
    const batchSize = 50; // Conservative batch size
    
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      
      const emailPromises = batch.map(async (recipient) => {
        try {
          const emailHtml = createEmailTemplate({
            fullName: recipient.full_name,
            chapterTitle: chapter.title,
            bookTitle,
            chapterNumber: chapter.chapter_number,
            description: chapter.description || 'No description available',
            chapterUrl,
            priceInfo,
            unsubscribeUrl: `${siteUrl}/settings?unsubscribe=true`
          });

          // Brevo API call
          const response = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
              'api-key': brevoApiKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              sender: {
                name: 'MemoryCraver',
                email: 'notifications@memorycraver-app.com' // Can be ANY email - doesn't need to exist
              },
              to: [
                {
                  email: recipient.email,
                  name: recipient.full_name
                }
              ],
              subject: `📚 New Chapter Published: ${chapter.title}`,
              htmlContent: emailHtml,
            }),
          });

          const result = await response.json();

          if (!response.ok) {
            throw new Error(result.message || 'Failed to send email');
          }

          // Log successful send
          await supabase.from('email_notifications_log').insert({
            chapter_id: chapterId,
            user_id: recipient.user_id,
            email: recipient.email,
            notification_type: 'chapter_published',
            success: true,
          });

          successCount++;
          console.log(`✅ Sent to ${recipient.email}`);
          
        } catch (error) {
          failureCount++;
          console.error(`❌ Failed to send to ${recipient.email}:`, error);
          
          // Log failure
          await supabase.from('email_notifications_log').insert({
            chapter_id: chapterId,
            user_id: recipient.user_id,
            email: recipient.email,
            notification_type: 'chapter_published',
            success: false,
            error_message: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

      await Promise.all(emailPromises);
      
      // Small delay between batches to avoid rate limiting
      if (i + batchSize < recipients.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 7: Return Results
    // ═══════════════════════════════════════════════════════════
    
    console.log(`✅ Sent: ${successCount}, ❌ Failed: ${failureCount}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        sent: successCount,
        failed: failureCount,
        total: recipients.length,
        chapterTitle: chapter.title,
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    const err = error as Error;
    console.error('💥 Error:', err);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: err.message 
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

// ═══════════════════════════════════════════════════════════
// EMAIL TEMPLATE FUNCTION
// ═══════════════════════════════════════════════════════════

interface EmailTemplateProps {
  fullName: string;
  chapterTitle: string;
  bookTitle: string;
  chapterNumber: number;
  description: string;
  chapterUrl: string;
  priceInfo: string;
  unsubscribeUrl: string;
}

function createEmailTemplate(props: EmailTemplateProps): string {
  const {
    fullName,
    chapterTitle,
    bookTitle,
    chapterNumber,
    description,
    chapterUrl,
    priceInfo,
    unsubscribeUrl,
  } = props;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Chapter Published</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Georgia', serif; background-color: #0a0a0a; color: #e8e8e8;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); border: 1px solid #d4af37; border-radius: 8px; overflow: hidden;">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #d4af37 0%, #c9a961 100%); padding: 30px 40px; text-align: center;">
              <h1 style="margin: 0; color: #0a0a0a; font-size: 28px; font-weight: 700; text-shadow: 1px 1px 2px rgba(255,255,255,0.3);">
                📚 MemoryCraver
              </h1>
              <p style="margin: 8px 0 0 0; color: #1a1a1a; font-size: 14px; font-weight: 500;">
                A New Chapter Awaits
              </p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              
              <!-- Greeting -->
              <p style="margin: 0 0 20px 0; font-size: 16px; color: #e8e8e8;">
                Hello <strong style="color: #d4af37;">${fullName}</strong>,
              </p>
              
              <!-- Main Message -->
              <p style="margin: 0 0 25px 0; font-size: 16px; line-height: 1.6; color: #e8e8e8;">
                Great news! A new chapter has just been published:
              </p>
              
              <!-- Chapter Card -->
              <div style="background: rgba(212, 175, 55, 0.1); border-left: 4px solid #d4af37; padding: 20px; margin: 0 0 25px 0; border-radius: 4px;">
                <p style="margin: 0 0 8px 0; font-size: 12px; color: #c9a961; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">
                  ${bookTitle}
                </p>
                <h2 style="margin: 0 0 12px 0; font-size: 22px; color: #fff; font-weight: 700;">
                  Chapter ${chapterNumber}: ${chapterTitle}
                </h2>
                <p style="margin: 0 0 15px 0; font-size: 14px; color: #c0c0c0; line-height: 1.5;">
                  ${description}
                </p>
                <p style="margin: 0; font-size: 14px;">
                  ${priceInfo}
                </p>
              </div>
              
              <!-- CTA Button -->
              <table role="presentation" style="margin: 0 0 30px 0;">
                <tr>
                  <td style="text-align: center;">
                    <a href="${chapterUrl}" style="display: inline-block; background: linear-gradient(135deg, #d4af37 0%, #c9a961 100%); color: #0a0a0a; text-decoration: none; padding: 15px 40px; border-radius: 6px; font-weight: 700; font-size: 16px; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 4px 12px rgba(212, 175, 55, 0.3);">
                      Read Now →
                    </a>
                  </td>
                </tr>
              </table>
            
          <!-- Footer -->
          <tr>
            <td style="background: #1a1a1a; padding: 25px 40px; border-top: 1px solid #333;">
              <p style="margin: 0 0 10px 0; font-size: 12px; color: #808080; text-align: center;">
                © 2026 MemoryCraver. All rights reserved.
              </p>
              <p style="margin: 0; font-size: 11px; color: #606060; text-align: center;">
                Don't want these notifications? 
                <a href="${unsubscribeUrl}" style="color: #d4af37; text-decoration: underline;">Unsubscribe here</a>
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}