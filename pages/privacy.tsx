import Link from 'next/link';
import LegalPage from '@/components/LegalPage';
import { COMPANY } from '@/lib/legal';

export default function PrivacyPolicy() {
  return <LegalPage title="Privacy Policy">
    <p>This Privacy Policy explains how {COMPANY.legalName}, doing business as {COMPANY.dba} (&ldquo;we,&rdquo; &ldquo;us&rdquo;), collects, uses and shares information when you visit {COMPANY.site}, submit a form, call our live demo line, or receive text messages from us.</p>

    <h2>Information we collect</h2>
    <ul>
      <li><b>Information you give us:</b> your name, business name, phone number and email address when you submit our intake or consultation forms.</li>
      <li><b>Calls to our demo line:</b> calls are answered by an AI sales agent and are recorded and transcribed. We receive the audio recording, the transcript, your phone number, and details you share during the call.</li>
      <li><b>Text messages:</b> your phone number, the messages exchanged, and your opt-in and opt-out choices.</li>
      <li><b>Website usage:</b> pages visited, device and browser type, approximate location and referring site, collected through cookies and Google Analytics.</li>
    </ul>

    <h2>How we use information</h2>
    <ul>
      <li>To respond to your inquiry, schedule a consultation and prepare a service estimate.</li>
      <li>To operate, review and improve the demo line and our AI sales agent.</li>
      <li>To send text messages you have agreed to receive, and to honor opt-out requests.</li>
      <li>To understand how our website is used and to keep it secure.</li>
      <li>To comply with legal obligations.</li>
    </ul>

    <h2>How we share information</h2>
    <p>We share information only with service providers that help us run our business, such as companies that host our website and database, carry our calls and text messages, provide speech recognition and voice services, and measure website usage. They may use it only to provide services to us. We may also disclose information when required by law or to protect our rights.</p>
    <p><b>We do not sell your personal information.</b> No mobile information will be shared with third parties or affiliates for marketing or promotional purposes. Text messaging originator opt-in data and consent are not shared with any third parties.</p>

    <h2>Call recordings and retention</h2>
    <p>Demo-line recordings and transcripts are kept for up to 90 days unless we need them longer to respond to you or to meet a legal obligation. Form submissions are kept for as long as needed to serve your inquiry and maintain our business records.</p>

    <h2>Your choices</h2>
    <ul>
      <li>Reply <b>STOP</b> to any text message to stop receiving texts, or <b>HELP</b> for help. See our <Link href="/sms-terms">SMS Terms</Link>.</li>
      <li>You can block or delete cookies in your browser settings.</li>
      <li>You can ask us to access, correct or delete the personal information we hold about you by emailing <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>.</li>
    </ul>

    <h2>Security</h2>
    <p>We use reasonable administrative and technical safeguards to protect information. No method of transmission or storage is completely secure.</p>

    <h2>Children</h2>
    <p>Our services are intended for businesses and are not directed to children under 13. We do not knowingly collect their information.</p>

    <h2>Changes</h2>
    <p>We may update this policy. The &ldquo;Last updated&rdquo; date above shows when it last changed.</p>

    <h2>Contact us</h2>
    <p>{COMPANY.legalName}<br />{COMPANY.address}<br /><a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a> &middot; {COMPANY.phone}</p>
  </LegalPage>;
}
