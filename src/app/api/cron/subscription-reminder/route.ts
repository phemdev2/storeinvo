import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendSubscriptionReminder } from '@/lib/emails';

export const runtime = 'nodejs';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  // Secure the cron endpoint
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Find subscriptions expiring in exactly 3 days
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    const dayStart = new Date(threeDaysFromNow);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(threeDaysFromNow);
    dayEnd.setHours(23, 59, 59, 999);

    const { data: companies, error } = await supabaseAdmin
      .from('companies')
      .select('id, name, subscription_plan, subscription_ends_at')
      .eq('subscription_status', 'active')
      .gte('subscription_ends_at', dayStart.toISOString())
      .lte('subscription_ends_at', dayEnd.toISOString());

    if (error) throw error;
    if (!companies?.length) {
      return NextResponse.json({ message: 'No expiring subscriptions', count: 0 });
    }

    let sent = 0;

    for (const company of companies) {
      // Get admin profile + email
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('full_name, id')
        .eq('company_id', company.id)
        .eq('role', 'admin')
        .single();

      if (!profile) continue;

      // Get email from auth.users
      const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(profile.id);
      if (!user?.email) continue;

      await sendSubscriptionReminder({
        email: user.email,
        name: profile.full_name || 'there',
        plan: company.subscription_plan || 'monthly',
        endsAt: company.subscription_ends_at,
        daysLeft: 3,
      }).catch((err) => console.error('Reminder email failed:', err));

      sent++;
    }

    return NextResponse.json({ message: 'Reminders sent', count: sent });

  } catch (err: any) {
    console.error('[Cron] error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}