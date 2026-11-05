import Head from 'next/head';
import Link from 'next/link';
import styles from '../styles/stellar-home-preview.module.css';

const reasons = [
 {number:'01',title:'Always-on responsiveness',description:'Customers expect meaningful answers and clear next steps even when your team is occupied or your office is closed.'},
 {number:'02',title:'Workforce alignment',description:'Move predictable, recurring activities to intelligent systems so employees can spend more time on judgment and relationships.'},
 {number:'03',title:'Operational continuity',description:'Connect conversations, tasks, and follow-up rather than leaving vital customer work in disconnected channels.'},
 {number:'04',title:'More efficient cost structures',description:'Reconsider how routine work is staffed, measured, and delivered while maintaining appropriate human oversight.'},
];
const products = [
 {index:'01',name:'Customer Engagement Operations Center',label:'THE CONNECTED PLATFORM',description:'The operating environment that connects customer records, conversations, work assignments, and the people responsible for the next step.',detail:'One coordinated view across customer engagement, sales, and support.'},
 {index:'02',name:'Sales Specialist',label:'INTELLIGENT SALES ENGAGEMENT',description:'An intelligent front line for inbound customer inquiries, lead intake, approved answers, and the follow-up context your team needs.',detail:'Your business may close. Your sales operation can remain available.'},
 {index:'03',name:'Support Specialist',label:'INTELLIGENT CUSTOMER SUPPORT',description:'An intelligent support intake and coordination service that helps customers explain their needs while verified tasks move through the operating workflow.',detail:'Natural conversation. Verified service outcomes.'},
];
export default function StellarHomepagePreview(){
 return <>
 <Head><title>Homepage Preview | Stellar Intelligent Technologies</title><meta name="robots" content="noindex,nofollow"/><meta name="description" content="Private concept preview of Stellar Intelligent Technologies' New Age Workforce homepage." /></Head>
 <div className={styles.page}>
  <header className={styles.header}>
   <div className={styles.topline}><span>HOMEPAGE CONCEPT PREVIEW</span><span>NOT THE PRODUCTION WEBSITE</span></div>
   <div className={styles.headerInner}>
    <a className={styles.wordmark} href="#top"><span className={styles.wordmarkPrimary}>STELLAR</span><span className={styles.wordmarkSecondary}>INTELLIGENT TECHNOLOGIES</span><span className={styles.operator}>Operated by Apropos Group LLC</span></a>
    <nav className={styles.nav} aria-label="Preview sections"><a href="#why">Why the Shift</a><a href="#model">New Age Workforce</a><a href="#products">Three Solutions</a><a href="#questions">Questions</a></nav>
    <Link href="/intake" className={styles.headerLink}>Explore the Possibilities <span aria-hidden="true">↗</span></Link>
   </div>
  </header>
  <main id="top">
   <section className={styles.hero}>
    <div className={styles.heroInner}>
     <div className={styles.overline}>THE FUTURE OF BUSINESS · REDEFINING THE WORK</div>
     <h1>Why Businesses Are Moving Toward the <em>New Age Workforce.</em></h1>
     <p className={styles.heroLead}>Human intelligence and intelligent technology are beginning to work together in a different way.</p>
     <p className={styles.heroCopy}>The opportunity is not simply to automate more. It is to reconsider how work gets done—allowing intelligent systems to support recurring responsibilities while employees focus on judgment, relationships, creativity, and business growth.</p>
     <div className={styles.actions}><a className={styles.primary} href="#why">Understand the Shift <span>↘</span></a><a className={styles.secondary} href="#products">Explore the Three Systems <span>→</span></a></div>
     <div className={styles.heroFoot}><span>PEOPLE</span><span className={styles.goldPlus}>+</span><span>INTELLIGENT SYSTEMS</span><span className={styles.goldPlus}>=</span><span>A MORE RESPONSIVE OPERATION</span></div>
    </div>
   </section>
   <section id="why" className={styles.section}>
    <div className={styles.sectionHeading}><div><span className={styles.eyebrow}>01 · UNDERSTANDING THE CHANGE</span><h2>The shift is already <em>underway.</em></h2></div><p>Businesses are rethinking which responsibilities require human attention—and which can be supported reliably by intelligent technology.</p></div>
    <div className={styles.reasonGrid}>{reasons.map(item=><article className={styles.reasonCard} key={item.number}><span className={styles.cardNumber}>{item.number}</span><h3>{item.title}</h3><p>{item.description}</p></article>)}</div>
   </section>
   <section id="model" className={styles.contrastSection}>
    <div className={styles.contrastInner}><span className={styles.eyebrow}>02 · A NEW MODEL FOR WORK</span><h2>It isn't about replacing people. <em>It's about redefining responsibilities.</em></h2><div className={styles.quoteRule}/>
    <p>The most valuable contribution of intelligent technology is not imitation of the human workforce. It is handling defined, repeatable activities so people can concentrate on what requires human understanding.</p>
    <div className={styles.modelGrid}><div><span>INTELLIGENT SYSTEMS</span><h3>Handle the predictable.</h3><p>Routine inquiries, structured intake, workflow updates, and approved operational tasks.</p></div><div><span>YOUR PEOPLE</span><h3>Lead where it matters.</h3><p>Customer relationships, complex decisions, problem solving, and strategic opportunities.</p></div></div>
    </div>
   </section>
   <section id="products" className={styles.section}>
    <div className={styles.sectionHeading}><div><span className={styles.eyebrow}>03 · THE STELLAR INTELLIGENT TECHNOLOGIES SUITE</span><h2>Three systems. <em>One direction.</em></h2></div><p>From the intelligent platform to sales and support engagement, each system has a distinct responsibility within the customer lifecycle.</p></div>
    <div className={styles.productGrid}>{products.map(item=><article className={styles.productCard} key={item.index}><div className={styles.productTop}><span>{item.index}</span><span className={styles.productLabel}>{item.label}</span></div><h3>{item.name}</h3><p>{item.description}</p><div className={styles.productDetail}>{item.detail}</div><Link className={styles.productLink} href="/intake">Discuss this system <span>↗</span></Link></article>)}</div>
   </section>
   <section className={styles.flowSection}><div className={styles.flowInner}><span className={styles.eyebrow}>04 · PRACTICAL WORKFORCE ALIGNMENT</span><h2>From traditional workflows to <em>intelligent execution.</em></h2><div className={styles.flowGrid}>{[['01','Identify recurring work'],['02','Establish approved business rules'],['03','Assign defined tasks to intelligent systems'],['04','Keep people informed and in control']].map(s=><div className={styles.flowStep} key={s[0]}><span>{s[0]}</span><strong>{s[1]}</strong></div>)}</div></div></section>
   <section id="questions" className={styles.section}><div className={styles.sectionHeading}><div><span className={styles.eyebrow}>05 · QUESTIONS WORTH ASKING</span><h2>Is your business ready to <em>redefine the work?</em></h2></div><p>The right starting point is understanding existing workflows and deciding where intelligence can support better customer experiences.</p></div><div className={styles.questions}><p>What happens when a customer reaches your business after hours?</p><p>Which routine responsibilities take your employees away from higher-value work?</p><p>Could your sales and support teams benefit from better continuity and context?</p></div></section>
   <section className={styles.closing}><span className={styles.eyebrow}>DISCOVER THE POSSIBILITIES</span><h2>A more responsive business begins with <em>a different approach to work.</em></h2><p>Explore how intelligent customer engagement, sales, and support systems can complement the people who drive your business forward.</p><Link href="/intake" className={styles.primary}>Learn About Stellar's Approach <span>↗</span></Link></section>
  </main>
  <footer className={styles.footer}><div><strong>STELLAR INTELLIGENT TECHNOLOGIES</strong><span>Operated by Apropos Group LLC</span></div><div><span>Premium Presence before Persuasion.</span><Link href="/">Return to current homepage ↗</Link></div></footer>
 </div>
 </>;
}
