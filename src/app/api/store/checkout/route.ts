import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { name, phone, email, items, total, companyId } = await req.json();

    if (!email || !items?.length || !total || !companyId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const res = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount: Math.round(total * 100), // convert to kobo
        metadata: {
          company_id: companyId,
          customer_name: name,
          customer_phone: phone,
          order_items: items,
          order_type: 'storefront',
        },
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/store/callback?company_id=${companyId}`,
      }),
    });

    const data = await res.json();

    if (!data.status) {
      return NextResponse.json({ error: data.message }, { status: 400 });
    }

    return NextResponse.json({ url: data.data.authorization_url });

  } catch (err: any) {
    console.error('Store checkout error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}