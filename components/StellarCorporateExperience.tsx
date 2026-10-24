import Link from 'next/link';
import {useState} from 'react';
import s from '@/styles/stellarNarrative.module.css';

const products=[
 {name:'Property Management Assistant',group:'PROPERTY OPERATIONS',href:'/solutions/property-management-assistant',promise:'Emergency response coordination, resident questions, leasing requests, and maintenance intake.',detail:'Designed to route urgent property concerns according to approved procedures and verified escalation contacts.'},
 {name:'Contact Center Solutions',group:'CUSTOMER COMMUNICATIONS',href:'/products/support-specialist',promise:'A coordinated approach to responding to inbound calls and directing requests.',detail:'Explore the Support Specialist and other customer communication workflows through the existing product and demo experience.'},
 {name:'Customer Engagement Solutions',group:'CONNECTED OPERATIONS',href:'/products/customer-engagement-operations-center',promise:'Customer context, engagement workflow visibility, and operating control.',detail:'Discover the Customer Engagement Operations Center and the intelligent services it connects.'},
 {name:'Lead Management Solutions',group:'GROWTH OPERATIONS',href:'/products/sales-service-system',promise:'Inbound opportunity intake, qualification, and connected follow-up context.',detail:'See how the Sales Specialist supports responsiveness and passes useful information to the people advancing the relationship.'}
] as const;
const benefits=[
 {name:'Increase productivity',detail:'Give employees time back by directing structured recurring work through approved workflows.'},
 {name:'Improve customer experience',detail:'Make interactions clearer, more consistent, and easier to follow through.'},
 {name:'Automate repetitive tasks',detail:'Handle predictable requests with defined boundaries and appropriate human oversight.'},
 {name:'Improve operational efficiency',detail:'Reduce disconnected handoffs and make responsibilities easier to coordinate.'},
 {name:'Operate continuously',detail:'Support customer contact outside staffed office hours when services are configured and available.'},
 {name:'Increase responsiveness',detail:'Start capturing important inquiries promptly so follow-up does not depend solely on who is available.'},
 {name:'Scale efficiently',detail:'Review operating needs and service capacity as the business changes.'},
 {name:'Reduce administrative work',detail:'Move recurring intake and routing tasks away from higher-value employee responsibilities.'},
] as const;
export function CorporatePortfolio(){
 const [selected,setSelected]=useState(0);const p=products[selected];
 return <div className={s.portfolio}>
 <div className={s.portfolioTabs} role="tablist" aria-label="Explore Stellar business products">{products.map((item,i)=><button key={item.name} id={`portfolio-tab-${i}`} role="tab" aria-selected={selected===i} aria-controls="stellar-portfolio-panel" tabIndex={selected===i?0:-1} onClick={()=>setSelected(i)} onKeyDown={e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();const n=(i+(e.key==='ArrowRight'?1:products.length-1))%products.length;setSelected(n);document.getElementById(`portfolio-tab-${n}`)?.focus()}}}><span>0{i+1}</span><strong>{item.name}</strong><span aria-hidden="true">{selected===i?'◆':'↗'}</span></button>)}</div>
 <div id="stellar-portfolio-panel" className={s.portfolioDisplay} role="tabpanel" aria-labelledby={`portfolio-tab-${selected}`} key={selected}><p className={s.eyebrow}>SELECTED BUSINESS PRODUCT / {p.group}</p><h3>{p.name}</h3><p>{p.promise}</p><div className={s.portfolioSignal}><span className={s.pulse} aria-hidden="true"/><span>PRODUCT EXPLORER · INTERACTIVE PREVIEW</span></div><p className={s.portfolioDetail}>{p.detail}</p><div className={s.portfolioActions}><Link href={p.href} className={s.primary}>Explore this product ↗</Link><Link href="/demo" className={s.secondary}>Experience a demo ↗</Link></div><small>Product information and demonstrations are subject to configured capabilities and verified workflows.</small></div>
 </div>;
}
export function BusinessBenefits(){
 const [active,setActive]=useState(0);
 return <div className={s.benefitsShell}><div className={s.benefitsOptions}>{benefits.map((b,i)=><button type="button" key={b.name} aria-pressed={active===i} onClick={()=>setActive(i)}><span className={s.benefitDot} aria-hidden="true"/>{b.name}<span aria-hidden="true">↗</span></button>)}</div><div className={s.benefitsResponse} aria-live="polite"><p className={s.eyebrow}>BUSINESS OUTCOME / {String(active+1).padStart(2,'0')}</p><h3>{benefits[active].name}</h3><p>{benefits[active].detail}</p><div className={s.responseTrace} aria-hidden="true"><i/><i/><i/><i/><i/><i/><i/></div><small>Select another outcome to explore the operational benefit.</small></div></div>;
}
export function EmergencyCoordination(){
 const [scenario,setScenario]=useState<'urgent'|'standard'>('urgent');
 const urgent=scenario==='urgent';
 return <div className={s.emergencyShell}>
 <div className={s.emergencyCopy}><p className={s.eyebrow}>FEATURED BUSINESS PRODUCT / PROPERTY MANAGEMENT ASSISTANT</p><h3>When Something Goes Wrong, <em>Everyone Knows.</em></h3><p>24/7 emergency response coordination is the PMA service objective: route urgent reports through approved escalation and notification pathways.</p><div className={s.emergencySwitch}><button aria-pressed={urgent} onClick={()=>setScenario('urgent')}>Emergency coordination</button><button aria-pressed={!urgent} onClick={()=>setScenario('standard')}>Routine maintenance</button></div><Link href="/solutions/property-management-assistant" className={s.secondary}>Explore Property Management Assistant ↗</Link></div>
 <div className={s.emergencySequence}><p className={s.eyebrow}>WORKFLOW ILLUSTRATION · NOT A LIVE EVENT</p><div className={s.eventSource}><span className={s.pulse} aria-hidden="true"/> {urgent?'Urgent maintenance concern reported':'Routine maintenance request received'}</div><div className={s.sequenceStem} aria-hidden="true"/>{(urgent?['Tenant: acknowledgment pathway','Owner: escalation pathway','Maintenance: dispatch notification pathway']:['Resident: intake acknowledgment','Property team: review queue','Maintenance: scheduling review']).map((t,i)=><div className={s.sequenceRow} key={t}><span className={s.sequenceIndex}>0{i+1}</span><span>{t}</span><span className={s.sequenceIcon} aria-hidden="true">↗</span></div>)}<small>Illustrative target workflow only. Actual notices, delivery, and confirmations must be verified against tenant-specific integrations before public claims of automatic completion.</small></div>
 </div>;
}
