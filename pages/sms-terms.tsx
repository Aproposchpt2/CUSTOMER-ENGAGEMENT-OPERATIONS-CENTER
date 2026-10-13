import Link from 'next/link';
import LegalPage from '@/components/LegalPage';
import { COMPANY } from '@/lib/legal';

export default function SmsTerms() {
  return <LegalPage title="SMS Terms">
    <h2>Program</h2>
    <p>StellarUC, operated by {COMPANY.legalName}, sends text messages about your inquiry, consultation scheduling and service follow-up to people who opt in through our website intake form or by request.</p>

    <h2>Opting in</h2>
    <p>You opt in by checking the text-message consent box on our intake form. Consent is not a condition of purchase.</p>

    <h2>Message frequency and cost</h2>
    <p>Message frequency varies based on your inquiry. Message and data rates may apply.</p>

    <h2>Opting out and help</h2>
    <p>Reply <b>STOP</b> to any message to stop receiving texts; we will send one confirmation and no further messages. Reply <b>HELP</b> for help, or contact <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a> or {COMPANY.phone}.</p>

    <h2>Carriers</h2>
    <p>Carriers are not liable for delayed or undelivered messages.</p>

    <h2>Privacy</h2>
    <p>No mobile information will be shared with third parties or affiliates for marketing or promotional purposes. See our <Link href="/privacy">Privacy Policy</Link>.</p>
  </LegalPage>;
}
