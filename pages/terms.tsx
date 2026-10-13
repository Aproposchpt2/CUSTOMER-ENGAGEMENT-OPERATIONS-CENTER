import Link from 'next/link';
import LegalPage from '@/components/LegalPage';
import { COMPANY } from '@/lib/legal';

export default function TermsOfService() {
  return <LegalPage title="Terms of Service">
    <p>These Terms of Service govern your use of {COMPANY.site} and our live demo line, operated by {COMPANY.legalName}, doing business as {COMPANY.dba}. By using the site or calling the demo line, you agree to these terms.</p>

    <h2>Use of the site and demo line</h2>
    <p>The website and demo line are provided to show how the StellarUC Sales Service System works and to let you request a consultation. You agree not to misuse them, including by attempting unauthorized access, disrupting service, or submitting false information.</p>

    <h2>AI agent and call recording</h2>
    <p>Calls to the live demo line are answered by an AI sales agent and are recorded and transcribed. By calling, you consent to this recording and transcription. The AI agent may make mistakes; its responses are not professional advice and do not create a contract.</p>

    <h2>Text messages</h2>
    <p>If you opt in to text messages, our <Link href="/sms-terms">SMS Terms</Link> apply.</p>

    <h2>Pricing and services</h2>
    <p>Information on this site is for general information only. Pricing, features and service terms for any purchase are set out in a written service estimate or agreement, which controls over anything on this site.</p>

    <h2>Intellectual property</h2>
    <p>The site, the StellarUC name and logos, and all content are owned by {COMPANY.legalName} or its licensors and may not be copied or used without permission.</p>

    <h2>Disclaimers</h2>
    <p>The site and demo line are provided &ldquo;as is&rdquo; and &ldquo;as available,&rdquo; without warranties of any kind, to the fullest extent permitted by law.</p>

    <h2>Limitation of liability</h2>
    <p>To the fullest extent permitted by law, {COMPANY.legalName} will not be liable for any indirect, incidental, special or consequential damages arising from your use of the site or demo line.</p>

    <h2>Governing law</h2>
    <p>These terms are governed by the laws of the State of Nevada, without regard to conflict-of-law rules.</p>

    <h2>Changes</h2>
    <p>We may update these terms. The &ldquo;Last updated&rdquo; date above shows when they last changed.</p>

    <h2>Contact us</h2>
    <p>{COMPANY.legalName}<br />{COMPANY.address}<br /><a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a> &middot; {COMPANY.phone}</p>
  </LegalPage>;
}
