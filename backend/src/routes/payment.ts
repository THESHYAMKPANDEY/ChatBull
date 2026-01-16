import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import User from '../models/User';
import { verifyFirebaseToken } from '../middleware/auth';

const router = Router();

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2023-10-16', // Use a recent API version
});

// Create Checkout Session
router.post('/create-checkout-session', verifyFirebaseToken, async (req: Request, res: Response) => {
  try {
    const firebaseUser = (res.locals as any).firebaseUser;
    const user = await User.findOne({ firebaseUid: firebaseUser.uid });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'ChatBull Premium',
              description: 'Unlock exclusive features',
            },
            unit_amount: 499, // $4.99
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.CLIENT_URL || 'http://localhost:3000'}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL || 'http://localhost:3000'}/cancel`,
      client_reference_id: user._id.toString(),
      customer_email: user.email,
    });

    res.json({ id: session.id, url: session.url });
  } catch (error: any) {
    console.error('Stripe session creation failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// Webhook to handle subscription updates
// Note: This endpoint must be excluded from body parsing (use raw body)
router.post('/webhook', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    if (!endpointSecret || !sig) throw new Error('Missing secret or signature');
    // In a real Express app, you need to ensure req.body is raw buffer for webhooks
    // This often requires specific middleware configuration in index.ts
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err: any) {
    console.error(`Webhook Error: ${err.message}`);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.client_reference_id) {
        await User.findByIdAndUpdate(session.client_reference_id, { isPremium: true });
        console.log(`User ${session.client_reference_id} upgraded to Premium`);
      }
      break;
    case 'customer.subscription.deleted':
      // Handle subscription cancellation
      // You would need to map stripe customer ID to user to downgrade
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.send();
});

export default router;
