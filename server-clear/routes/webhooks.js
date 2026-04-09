import { Webhook } from 'svix';
import User from '../models/User.js';
import process from 'process';


export async function handleClerkWebhook(req, res) {
  const SIGNING_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  const wh = new Webhook(SIGNING_SECRET);
  let evt;

  try {
    evt = wh.verify(JSON.stringify(req.body), {
      'svix-id':        req.headers['svix-id'],
      'svix-timestamp': req.headers['svix-timestamp'],
      'svix-signature': req.headers['svix-signature'],
    });
  } catch {
    return res.status(400).json({ error: 'Invalid signature' });
  }

  const { type, data } = evt;

 switch (type) {
    case 'user.created':
      await User.create({
        clerkId:   data.id,
        email:     data.email_addresses[0]?.email_address,
        firstName: data.first_name,
        lastName:  data.last_name,
        imageUrl:  data.image_url,
      });
      break;

    case 'user.updated':
      await User.findOneAndUpdate(
        { clerkId: data.id },
        {
          email:     data.email_addresses[0]?.email_address,
          firstName: data.first_name,
          lastName:  data.last_name,
          imageUrl:  data.image_url,
          updatedAt: new Date(),
        }
      );
      break;

    case 'user.deleted':
      await User.findOneAndDelete({ clerkId: data.id });
      break;
  }

  res.json({ received: true });
}
