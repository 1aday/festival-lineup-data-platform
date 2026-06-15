import { NextRequest, NextResponse } from 'next/server';

import { getStripe, isStripeConfigured } from '@/lib/stripe';
import { getStripeCheckoutProduct } from '@/lib/stripe-products';

function getBaseUrl(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (origin) {
    return origin;
  }

  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  if (host) {
    const proto = request.headers.get('x-forwarded-proto') || (host.startsWith('localhost') ? 'http' : 'https');
    return `${proto}://${host}`;
  }

  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL;

  if (configuredUrl) {
    return configuredUrl.startsWith('http') ? configuredUrl : `https://${configuredUrl}`;
  }

  return 'http://localhost:3000';
}

export async function POST(request: NextRequest) {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: 'Stripe is not configured. Set STRIPE_SECRET_KEY to enable checkout.' },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const product = getStripeCheckoutProduct(body?.sku);

    if (!product) {
      return NextResponse.json({ error: 'Invalid checkout product' }, { status: 400 });
    }

    const baseUrl = getBaseUrl(request);
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      customer_creation: 'always',
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: product.unitAmount,
            product_data: {
              name: product.name,
              description: product.description,
              metadata: {
                sku: product.sku,
                offerType: product.offerType,
              },
            },
          },
        },
      ],
      metadata: {
        sku: product.sku,
        offerType: product.offerType,
        fulfillment: product.delivery,
      },
      success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}&sku=${product.sku}`,
      cancel_url: `${baseUrl}/checkout/cancel?sku=${product.sku}`,
    });

    if (!session.url) {
      return NextResponse.json({ error: 'Stripe did not return a checkout URL' }, { status: 502 });
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
