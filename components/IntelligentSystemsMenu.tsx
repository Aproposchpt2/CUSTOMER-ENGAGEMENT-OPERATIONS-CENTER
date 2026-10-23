import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useRef, useState } from 'react';

const systems = [
  { label: 'CUSTOMER ENGAGEMENT', href: '/products/customer-engagement-operations-center' },
  { label: 'SALES SPECIALIST', href: '/products/sales-service-system' },
  { label: 'SUPPORT SPECIALIST', href: '/products/support-specialist' },
  { label: 'PROPERTY MANAGEMENT ASSISTANT', href: '/solutions/property-management-assistant' },
];

export default function IntelligentSystemsMenu(){
  const [open,setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const {asPath} = useRouter();
  useEffect(()=>setOpen(false),[asPath]);
  useEffect(()=>{
    if(!open)return;
    const closeOnOutside=(e:MouseEvent)=>{if(!root.current?.contains(e.target as Node))setOpen(false)};
    const closeOnEscape=(e:KeyboardEvent)=>{if(e.key==='Escape'){setOpen(false);button.current?.focus()}};
    document.addEventListener('pointerdown',closeOnOutside);
    document.addEventListener('keydown',closeOnEscape);
    return()=>{document.removeEventListener('pointerdown',closeOnOutside);document.removeEventListener('keydown',closeOnEscape)};
  },[open]);
  return <div className="intelligent-systems-menu" ref={root}>
    <button ref={button} type="button" className="systems-trigger" aria-haspopup="true" aria-expanded={open} aria-controls="systems-menu" onClick={()=>setOpen(v=>!v)}>Intelligent Systems <span aria-hidden="true">{open?'▴':'▾'}</span></button>
    {open&&<div id="systems-menu" className="systems-options" aria-label="Intelligent Systems product pages">
      {systems.map(item=><Link key={item.href} href={item.href} onClick={()=>setOpen(false)}>{item.label}</Link>)}
    </div>}
    <style jsx>{`
      .intelligent-systems-menu{position:relative;display:inline-block;flex:0 0 auto}
      .systems-trigger{appearance:none;border:1px solid #C8A84B66;border-radius:0;background:#101010;color:#E4C878;font-family:'DM Sans',Arial,sans-serif!important;font-size:13px;font-weight:500;min-height:44px;padding:10px 14px;white-space:nowrap;cursor:pointer}
      .systems-trigger span{margin-left:10px}
      .systems-trigger:focus-visible{outline:2px solid #E4C878;outline-offset:3px}
      .systems-options{position:absolute;top:calc(100% + 6px);right:0;z-index:100;width:min(350px,calc(100vw - 36px));display:flex;flex-direction:column;background:#101010;border:1px solid #C8A84B;box-shadow:0 18px 45px #000c}
      .systems-options :global(a){display:block;padding:16px 18px;min-height:48px;border-bottom:1px solid #C8A84B33;color:#F7F4EC!important;font:400 12px/1.5 'DM Sans',Arial,sans-serif!important;text-decoration:none;letter-spacing:.025em}
      .systems-options :global(a:last-child){border-bottom:0}
      .systems-options :global(a:hover),.systems-options :global(a:focus-visible){background:#29210e;color:#E4C878!important}
      @media(max-width:700px){.intelligent-systems-menu{width:100%;display:block}.systems-trigger{width:100%;text-align:left}.systems-options{position:relative;top:0;right:auto;width:100%;box-shadow:none;margin-top:4px}}
    `}</style>
  </div>;
}