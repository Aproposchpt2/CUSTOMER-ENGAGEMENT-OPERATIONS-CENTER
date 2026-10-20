import { BRAND, TAGLINE, ATTRIBUTION } from '@/lib/marketingProducts';
import s from '@/styles/marketing.module.css';
export default function BrandSignature(){return <div className={s.signature}><p className={s.heroBrand}>{BRAND}</p><p className={s.tagline}>{TAGLINE}</p><p className={s.attribution}>{ATTRIBUTION}</p></div>}
