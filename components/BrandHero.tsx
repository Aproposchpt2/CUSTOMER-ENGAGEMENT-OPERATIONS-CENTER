import { BRAND, ATTRIBUTION, TAGLINE } from '@/lib/marketingProducts';
import s from '@/styles/marketing.module.css';
export default function BrandHero({product, headline, description, children}: {product?:string;headline:string;description?:string;children?:React.ReactNode}) {
  return <section id="home" className={s.hero}>
    <div className={s.heroGrid} aria-hidden="true"/><div className={s.heroOrbit} aria-hidden="true"/>
    <div className={s.heroInner}>
      <p className={s.heroBrand}>{BRAND}</p>
      <p className={s.tagline}>{TAGLINE}</p>
      <div className={s.heroRule} aria-hidden="true"><span>✦</span></div>
      {product&&<p className={s.productLabel}>{product}</p>}
      <h1 className={s.heroHeadline}>{headline}</h1>
      {description&&<p className={s.heroDescription}>{description}</p>}
      {children&&<div className={s.heroActions}>{children}</div>}
      <p className={s.attribution}>{ATTRIBUTION}</p>
    </div>
    <div className={s.heroFoot}><span>HUMAN VISION. INTELLIGENT EXECUTION.</span><a href="#explore">EXPLORE BELOW <span aria-hidden="true">↓</span></a></div>
  </section>;
}
