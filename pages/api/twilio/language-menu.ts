import type { NextApiRequest, NextApiResponse } from 'next';
import { menuTwiml } from '@/lib/voiceLanguageMenu';

// Twilio's voice webhook for each agent number: plays the 1/2 language menu.
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed');
  res.setHeader('Content-Type', 'text/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).send(menuTwiml());
}
