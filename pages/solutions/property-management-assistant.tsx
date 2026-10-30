import Link from 'next/link';
import IntelligentSystemsMenu from '@/components/IntelligentSystemsMenu';
import {Section,PageFooter} from '@/components/StellarNarrative';
import {EmergencyCoordination} from '@/components/StellarCorporateExperience';
import s from '@/styles/stellarNarrative.module.css';

export default function PropertyManagementAssistant(){
 return <div className={s.site}>
 <a href="#main-content" className={s.secondary}>Skip to content</a>
 <header className={s.nav}><strong>STELLAR</strong><nav aria-label="Main navigation"><div><Link href="/">Home</Link><IntelligentSystemsMenu/><Link href="/demo">Live Demo</Link><Link href="/intake">Contact</Link></div></nav></header>
 <main id="main-content">
 <Section id="pma-experience" eyebrow="PROPERTY MANAGEMENT ASSISTANT / FEATURED PRODUCT" title="When Something Goes Wrong, Everyone Is Notified.">
 <p>Explore how an intelligent property-management operation can coordinate urgent reports, approved escalation pathways, maintenance requests, and responsible communication.</p>
 <EmergencyCoordination/>
 <p>Tenant notified. Owner notified. Maintenance notified. Automatically—when each required workflow has been configured and its actual delivery independently verified. The interactive sequence above illustrates the intended process; it is not a live-delivery confirmation.</p>
 </Section>
 <Section eyebrow="EXPLORE THE SERVICE" title="Experience The Difference."><p>Explore the configured live demonstration or describe your property's response and escalation requirements. An emergency should always be reported through the designated emergency services and property emergency channel; the demonstration is not an emergency dispatch service.</p><Link href="/demo" className={s.primary}>Launch Demo ↗</Link> <Link href="/intake" className={s.secondary}>Submit Property Requirements ↗</Link></Section>
 </main><PageFooter/>
 </div>
}