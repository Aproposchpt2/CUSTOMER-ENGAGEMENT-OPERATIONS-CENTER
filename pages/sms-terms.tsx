import Link from 'next/link';
import LegalPage from '@/components/LegalPage';
import { COMPANY, SMS_NUMBERS } from '@/lib/legal';

export default function SmsTerms() {
  return <LegalPage title="SMS Terms">
    <h2>Program</h2>
    <p>{COMPANY.smsSender}, a DBA of {COMPANY.legalName}, sends text messages about your inquiry, service requests, appointment scheduling and service follow-up to people who opt in. Messages are sent from these numbers:</p>
    <ul>{SMS_NUMBERS.map((n) => <li key={n.tel}>{n.label}: <a href={`tel:${n.tel}`}>{n.display}</a></li>)}</ul>

    <h2>Opting in</h2>
    <p>You opt in in either of these ways:</p>
    <ul>
      <li>On our <Link href="/intake">intake form</Link>, by entering your mobile number and checking the optional text-message consent box (it is never pre-checked).</li>
      <li>During a call with the Stellar Customer Care Center or Stellar Support Specialist AI agent, by saying yes when the agent asks whether it may text you about your request. The agent asks before any text is sent.</li>
    </ul>
    <p>Consent is not a condition of purchase.</p>

    <h2>Message frequency and cost</h2>
    <p>Message frequency varies based on your inquiry. Message and data rates may apply.</p>

    <h2>Opting out and help</h2>
    <p>Reply <b>STOP</b> to any message to stop receiving texts; we will send one confirmation and no further messages. Reply <b>HELP</b> for help, or contact <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>, {COMPANY.phone}, {COMPANY.address}.</p>

    <h2>Carriers</h2>
    <p>Carriers are not liable for delayed or undelivered messages.</p>

    <h2>Privacy</h2>
    <p>No mobile information will be shared with third parties or affiliates for marketing or promotional purposes. See our <Link href="/privacy">Privacy Policy</Link>.</p>
  </LegalPage>;
}
