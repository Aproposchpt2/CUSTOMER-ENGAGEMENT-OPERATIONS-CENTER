import Link from 'next/link';
import IntelligentSystemsMenu from '@/components/IntelligentSystemsMenu';
import { useRouter } from 'next/router';
import { useState, type ReactNode } from 'react';
import { BRAND, ATTRIBUTION, products, productHref } from '@/lib/marketingProducts';
import { COMPANY } from '@/lib/legal';
import s from '@/styles/marketing.module.css';

export default function MarketingLayout({children}: {children:ReactNode}) {
  const [open, setOpen] = useState(false);
  const { pathname } = useRouter();
  return <div className={s.site}>
    <a href="#main-content" className={s.skip}>Skip to content</a>
    <header className={s.header}>
      <Link href="/" className={s.navBrand} aria-label={`${BRAND} home`}><span className={s.brandSymbol} aria-hidden="true">✦</span><span>STELLAR<span className={s.brandSub}>INTELLIGENT TECHNOLOGIES</span></span></Link>
      <button className={s.menuButton} type="button" onClick={()=>setOpen(!open)} aria-expanded={open} aria-controls="marketing-navigation">{open ? 'Close −' : 'Menu +'}</button>
      <nav id="marketing-navigation" className={`${s.nav} ${open?s.navOpen:''}`} aria-label="Main navigation">
        {[['/','Home'],['/about','Our Perspective']].map(([href,label])=><Link key={href} href={href} aria-current={pathname===href?'page':undefined} onClick={()=>setOpen(false)}>{label}</Link>)}
        <IntelligentSystemsMenu/>
        <Link href="/intake" className={s.navCta} onClick={()=>setOpen(false)}>Let’s talk <span aria-hidden="true">↗</span></Link>
      </nav>
    </header>
    <main id="main-content">{children}</main>
    <footer className={s.footer}>
      <div className={s.footerTop}><div><p className={s.footerBrand}>{BRAND}</p><p>{ATTRIBUTION}</p><p>Intelligent Technology for the Workplace</p></div><Link href="/intake" className={s.footerInvitation}>Let’s redefine<br/>the work. <span aria-hidden="true">↗</span></Link></div>
      <div className={s.footerGrid}><div><span className={s.micro}>EXPLORE THE SYSTEMS</span>{products.map(p=><Link key={p.slug} href={productHref(p.slug)}>{p.name}</Link>)}</div><div><span className={s.micro}>COMPANY</span><Link href="/about">Our perspective</Link><a href="https://aproposgroupllc.com">Apropos Group LLC</a><a href="https://app.stellaruc.com">Find your workspace</a></div><div><span className={s.micro}>START A CONVERSATION</span><a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a><a href="tel:+18882589498">{COMPANY.phone}</a></div></div>
      <div className={s.footerBottom}><span>© {new Date().getFullYear()} APROPOS GROUP LLC</span><div><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/sms-terms">SMS Terms</Link></div></div>
    </footer>
  </div>;
}
