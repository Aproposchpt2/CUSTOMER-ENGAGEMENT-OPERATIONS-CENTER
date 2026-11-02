import Link from 'next/link';
import {useState} from 'react';
import styles from '@/styles/stellarShowroom.module.css';

const systems=[
 {name:'Customer Engagement Operations Center',category:'CONNECTED CUSTOMER OPERATIONS',tag:'The coordinating intelligence',summary:'Bring customer interactions, context and operational oversight into one coordinated business system.',features:['Engagement workflow visibility','Customer context and handoff continuity','Policy-led operating controls'],href:'/products/customer-engagement-operations-center',insight:'A coordinated center connects the parts of customer engagement that otherwise operate in isolation.'},
 {name:'Customer Care Center',category:'CUSTOMER RESPONSE',tag:'Always-ready customer care',summary:'Provide a professional first response, structured intake and configured follow-through for your customers.',features:['24/7/365 customer care model','English and Spanish engagement','Configured response and escalation'],href:'/products/customer-care-center',insight:'A consistent customer experience begins with being available to receive and understand every inquiry.'},
 {name:'Support Specialist',category:'SERVICE AND SUPPORT',tag:'Give your team the right context',summary:'Handle routine customer questions, identify issues and guide support requests toward the right next action.',features:['Approved support knowledge','Structured issue intake and ticket pathways','Human escalation when needed'],href:'https://specialist.stellaruc.com/',insight:'Intelligent support handles the structured work while your staff addresses the issues that require judgment.'},
 {name:'Sales Specialist',category:'SALES ENGAGEMENT',tag:'Every inquiry deserves a response',summary:'Engage prospective customers, gather qualification details and prepare useful context for sales follow-up.',features:['Inbound lead engagement','English and Spanish conversations','Qualification and follow-up pathways'],href:'https://sales.stellaruc.com/',insight:'When sales conversations begin promptly, your team can spend more time advancing the right opportunities.'},
 {name:'Property Management Assistant',category:'PROPERTY OPERATIONS',tag:'From incident report to resolution',summary:'A 24/7/365 customer care center for tenant requests, incident intake and coordinated property operations.',features:['Tenant incident reporting','Management and maintenance routing','Incident lifecycle visibility pathways'],href:'https://pma.stellaruc.com/',insight:'From incident report to resolution, everyone stays informed through configured status and notification workflows.'},
 {name:'Business Infrastructure as a Service',category:'BUSINESS INFRASTRUCTURE',tag:'Build the operating foundation',summary:'Explore the infrastructure services that support business technology operations and long-term adaptability.',features:['Business infrastructure planning','Service continuity considerations','Scalable operating foundations'],href:'https://biaas.stellaruc.com/',insight:'Intelligent operations depend on infrastructure designed to support evolving business requirements.'}
] as const;

export function SystemsShowroom(){
 const [active,setActive]=useState(0);
 return <section id="systems" className={styles.showroom} aria-labelledby="showroom-title">
 <div className={styles.heading}><span className={styles.eyebrow}>01 / DISCOVER THE INTELLIGENT SYSTEMS</span><h2 id="showroom-title">The systems behind<br/><em>the new workforce.</em></h2><p>You came here to discover what businesses are moving toward. Explore each STELLAR Intelligent Business System, see the work it is designed to handle, and visit its dedicated website for the full experience.</p></div>
 <div className={styles.grid}>{systems.map((system,i)=><article className={active===i?styles.cardActive:styles.card} key={system.name}>
 <button type="button" className={styles.cardSelect} aria-pressed={active===i} onClick={()=>setActive(i)} aria-label={`Explore ${system.name} features`}>
 <span className={styles.cardTop}><span>{String(i+1).padStart(2,'0')}</span><span>{system.category}</span><span aria-hidden="true">{active===i?'◆':'↗'}</span></span>
 <h3>{system.name}</h3><p>{system.summary}</p><span className={styles.selectHint}>{active===i?'Showing selected features':'Select to discover its capabilities'} <span aria-hidden="true">↘</span></span>
 </button>
 <div className={styles.cardBody}><span className={styles.goldTag}>{system.tag}</span><ul>{system.features.map(feature=><li key={feature}>{feature}</li>)}</ul><Link className={styles.visit} href={system.href} {...(system.href.startsWith('https:')?{target:'_blank',rel:'noopener noreferrer'}:{})}>Explore the dedicated product page ↗</Link></div>
 </article>)}</div>
 <aside className={styles.highlight} aria-live="polite"><div><span className={styles.eyebrow}>SELECTED SYSTEM / BUSINESS PERSPECTIVE</span><h3>{systems[active].name}</h3><p>{systems[active].insight}</p></div><Link href={systems[active].href} {...(systems[active].href.startsWith('https:')?{target:'_blank',rel:'noopener noreferrer'}:{})}>Explore {systems[active].name} ↗</Link></aside>
 <p className={styles.fine}>Features and integration pathways depend on the configured system. Automated transactions and notifications are confirmed only after the connected service verifies successful completion.</p>
 </section>
}