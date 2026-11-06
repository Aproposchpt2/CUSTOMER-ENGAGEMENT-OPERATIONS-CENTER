import {useState} from 'react';
import s from '@/styles/customSystemsHome.module.css';
const messages=[
 'INTELLIGENT SYSTEMS HANDLE THE PREDICTABLE',
 'YOUR PEOPLE DELIVER THE EXCEPTIONAL',
 'STELLAR INTELLIGENT SOFTWARE DEVELOPERS',
 'CUSTOMIZED BUSINESS SYSTEM DEVELOPMENT',
 'PRODUCTIVITY',
 'PROFITABILITY',
 '24/7 365 COVERAGE'
];
export function StellarMarquee(){
 const [paused,setPaused]=useState(false);
 const text=messages.map((message,i)=><span className={s.marqueeItem} key={i}>{message}<span aria-hidden="true" className={s.marqueeStar}>✦</span></span>);
 return <section className={s.marqueeShell} aria-label="STELLAR business systems and benefits">
   <div className={s.marqueeHeading}><span>STELLAR / BUSINESS SYSTEMS DEVELOPERS</span><button type="button" onClick={()=>setPaused(v=>!v)} aria-pressed={paused}>{paused?'Resume motion':'Pause motion'}</button></div>
   <div className={s.marqueeWindow} aria-label={messages.join('; ')}>
     <div className={paused?s.marqueePaused:s.marqueeTrack} aria-hidden="true"><div className={s.marqueeSet}>{text}</div><div className={s.marqueeSet}>{text}</div></div>
   </div>
 </section>;
}