import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    if (!body) return NextResponse.json({ error: 'Empty body' }, { status: 400 });

    const signature = req.headers.get('x-paystack-signature');
    if (!signature) return NextResponse.json({ error: 'No signature' }, { status: 401 });

    const hash = crypto
      .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!)
      .update(body)
      .digest('hex');

    if (hash !== signature) return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });

    const event = JSON.parse(body);
    const data = event.data;
    console.log('[Webhook] event:', event.event, JSON.stringify(data));

    switch (event.event) {

      case 'charge.success': {
        const companyId = data.metadata?.company_id;
        const customerCode = data.customer?.customer_code;
        const planInterval = data.plan?.interval ?? data.plan_object?.interval ?? null;

        if (companyId) {
          await supabaseAdmin
            .from('companies')
            .update({
              subscription_status: 'active',
              subscription_plan: planInterval,
              paystack_customer_code: customerCode,
              subscription_ends_at: planInterval === 'annually'
                ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
                : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            })
            .eq('id', companyId);

          console.log('[Webhook] Updated company:', companyId);
        }
        break;
      }

      case 'subscription.create': {
        const companyId = data.metadata?.company_id
          ?? data.customer?.metadata?.company_id
          ?? null;
        const customerCode = data.customer?.customer_code;

        if (customerCode) {
          const updateData: any = {
            subscription_status: 'active',
            subscription_plan: data.plan?.interval,
            subscription_ends_at: data.next_payment_date,
            paystack_customer_code: customerCode,
            paystack_subscription_code: data.subscription_code,
          };

          if (companyId) {
            await supabaseAdmin.from('companies').update(updateData).eq('id', companyId);
          } else {
            await supabaseAdmin.from('companies').update(updateData).eq('paystack_customer_code', customerCode);
          }
        }
        break;
      }

      case 'subscription.disable':
        await supabaseAdmin
          .from('companies')
          .update({ subscription_status: 'expired' })
          .eq('paystack_subscription_code', data.subscription_code);
        break;
    }

    return NextResponse.json({ received: true });

  } catch (err: any) {
    console.error('[Webhook] error:', err.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}