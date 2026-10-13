import Head from 'next/head';
import type { ReactNode } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { LEGAL_UPDATED } from '@/lib/legal';

export default function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return <>
    <Head><title>{`${title} | StellarUC`}</title></Head>
    <Header publicProductName="Sales Service System" />
    <main className="legal">
      <article>
        <small>LEGAL</small>
        <h1>{title}</h1>
        <p className="updated">Last updated {LEGAL_UPDATED}</p>
        {children}
      </article>
    </main>
    <Footer serviceName="Sales Service System" />
    <style jsx>{`
      .legal{background:#050505;color:var(--theme-text);padding:64px 20px 80px}
      article{max-width:820px;margin:0 auto}
      small{display:block;color:var(--theme-accent);font-size:.72rem;font-weight:800;letter-spacing:.12em}
      h1{font-size:clamp(2.2rem,5vw,3.4rem);margin:.4rem 0 .3rem}
      .updated{color:var(--theme-muted);margin:0 0 2.2rem}
      article :global(h2){font-size:1.6rem;color:var(--theme-accent-light);margin:2.2rem 0 .6rem}
      article :global(p),article :global(li){color:var(--theme-secondary);line-height:1.75}
      article :global(ul){padding-left:1.2rem}
      article :global(a){color:var(--theme-accent-light)}
    `}</style>
  </>;
}
