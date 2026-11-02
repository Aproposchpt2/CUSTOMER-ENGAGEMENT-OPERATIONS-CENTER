import Link from 'next/link';
import IntelligentSystemsMenu from '@/components/IntelligentSystemsMenu';
import {NarrativeHero,PageFooter} from '@/components/StellarNarrative';
import {SystemsShowroom} from '@/components/StellarSystemsShowroom';
import s from '@/styles/stellarNarrative.module.css';

export default function Home(){return <div className={s.site}>
<a href="#main-content" className={s.secondary}>Skip to content</a>
<header className={s.nav}><strong>STELLAR</strong><nav aria-label="Main navigation"><div><Link href="/">Home</Link><a href="#systems">Explore the Systems</a><IntelligentSystemsMenu/><a href="#intake">Consultation</a></div></nav></header>
<main id="main-content">
<NarrativeHero/>
<section style={{maxWidth:1200,margin:'0 auto',padding:'75px 28px 0',textAlign:'center'}}>
<p className={s.eyebrow}>DISCOVER WHY BUSINESSES ARE CHOOSING INTELLIGENT TECHNOLOGY</p>
<h2 style={{fontFamily:"'Cormorant Garamond',Georgia,serif",fontSize:'clamp(40px,5.8vw,74px)',fontWeight:400,lineHeight:1.08,margin:'20px auto',maxWidth:1020}}>You've heard about the new workforce.<br/><span style={{color:'#E4C878'}}>Now discover the systems behind it.</span></h2>
<p style={{fontSize:17,lineHeight:1.85,color:'#D3CEC1',maxWidth:850,margin:'0 auto'}}>Our intelligent business systems are designed to handle predictable customer interactions and structured operations, allowing your employees to focus on relationships, professional judgment and exceptional service.</p>
<a href="#systems" className={s.primary}>Explore the Intelligent Business Systems ↘</a>
</section>
<SystemsShowroom/>
<section id="philosophy" className={s.section} style={{maxWidth:1200,textAlign:'center',paddingTop:105,paddingBottom:105}}>
<p className={s.eyebrow}>02 / OUR WORKFORCE PHILOSOPHY</p>
<h2>REDEFINING TODAY&apos;S WORKFORCE.</h2>
<p style={{margin:'0 auto',fontSize:19,lineHeight:1.8}}>Intelligent Business Systems handle the predictable. Your people deliver the exceptional.</p>
<p style={{color:'#E4C878',letterSpacing:'.12em',fontSize:13,margin:'27px auto 0'}}>PRODUCTIVITY · EXTENDED COVERAGE · PROFITABILITY</p>
</section>
<section id="intake" className={s.section} style={{maxWidth:1250,textAlign:'center',paddingTop:90}}>
<p className={s.eyebrow}>03 / LET&apos;S TALK ABOUT YOUR BUSINESS</p>
<h2>Discover which system<br/>fits your operation.</h2>
<p style={{margin:'0 auto 25px',fontSize:16,lineHeight:1.8}}>Tell us how to reach you. We&apos;ll explore your customer contact requirements, business workflows and opportunities to improve coverage and productivity.</p>
<div style={{maxWidth:800,margin:'20px auto',border:'1px solid #C8A84B55',background:'#06111f'}}>
<iframe title="STELLAR business consultation intake form" src="/intake" loading="lazy" style={{display:'block',width:'100%',height:1120,border:0}}/>
</div>
<p style={{fontSize:13,color:'#D3CEC1'}}>The embedded form uses the existing STELLAR intake workflow and optional, unticked SMS consent choice. <Link href="/intake">Open the form in a full page ↗</Link></p>
</section>
</main><PageFooter/></div>}