import { useState } from 'react';
import Link from 'next/link';
import { products, productHref } from '@/lib/marketingProducts';
import s from '@/styles/marketing.module.css';
export default function SystemExplorer() {
  const [selected,setSelected] = useState(0);
  const p=products[selected];
  return <div className={s.explorer}>
    <div className={s.explorerGraphic}>
      <span className={s.micro}>EXPLORE THE ARCHITECTURE</span>
      <div className={s.systemMap}>
        <div className={s.specialistRow}>{[1,2].map(i=><button key={i} type="button" aria-pressed={selected===i} className={`${s.systemNode} ${selected===i?s.nodeSelected:''}`} onClick={()=>setSelected(i)}><span className={s.nodeNumber}>0{i+1}</span><span className={s.nodeIcon} aria-hidden="true">{i===1?'↗':'◈'}</span><span>{products[i].short}</span><span className={s.nodeRole}>SPECIALIST SYSTEM</span></button>)}</div>
        <div className={s.connectors} aria-hidden="true"><i/><span>CONNECTED THROUGH ONE FOUNDATION</span><i/></div>
        <button type="button" aria-pressed={selected===0} className={`${s.systemNode} ${s.foundationNode} ${selected===0?s.nodeSelected:''}`} onClick={()=>setSelected(0)}><span className={s.nodeNumber}>01 / THE FOUNDATION</span><span className={s.foundationTitle}>Customer Engagement<br/>Operations Center</span><span className={s.nodeRole}>CUSTOMER CONTEXT · WORKSPACE · FOLLOW-UP</span></button>
      </div>
      <p className={s.mapNote}>Select a system to explore its role.</p>
    </div>
    <div className={s.explorerDetail} aria-live="polite" aria-atomic="true"><span className={s.micro}>{p.number} / {p.category}</span><h3>{p.name}</h3><p>{p.description}</p><ul>{p.capabilities.slice(0,3).map(([title])=><li key={title}>{title}</li>)}</ul><Link href={productHref(p.slug)} className={s.textLink}>Explore this product <span aria-hidden="true">↗</span></Link></div>
  </div>;
}
