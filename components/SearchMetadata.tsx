import Head from 'next/head';
import { useRouter } from 'next/router';
import { BRAND, TAGLINE, products, productHref } from '@/lib/marketingProducts';
// canonical: set when a dedicated product subdomain is the page that should rank (cross-domain canonical).
// Products whose dedicated subdomain is the search-ranking page.
const SUBDOMAIN_CANONICAL:Record<string,string>={'support-specialist':'https://specialist.stellaruc.com/'};
const pages:Record<string,{title:string;description:string;canonical?:string}>={
 '/':{title:'Stellar Intelligent Technologies | Innovative Business Products',description:'Explore innovative business products for property management, customer engagement, contact center operations, and lead management.'},
 '/products':{title:`Intelligent Workplace Products | ${BRAND}`,description:'Explore three connected products: the foundational Customer Engagement Operations Center, the Sales Service System, and the Support Specialist Service System.'},
 '/about':{title:`Our Perspective | ${BRAND}`,description:'Enterprise communications experience and a new approach to organizing work. STELLAR INTELLIGENT TECHNOLOGIES. Operated by APROPOS GROUP LLC.'},
 '/demo':{title:`Live Sales Service Demo | ${BRAND}`,description:'Experience the intelligent Sales Specialist and see how a conversation becomes a captured inquiry with context for human follow-up.'},
 '/intake':{title:`Request a Consultation | ${BRAND}`,description:'Discuss your business needs and explore the appropriate intelligent workplace product configuration.'},
 '/platform':{title:`Customer Engagement Platform | ${BRAND}`,description:'Explore customer engagement capabilities, connected workspaces, and operations.'},
 '/partners':{title:`Partner Opportunities | ${BRAND}`,description:'Explore the customer engagement platform for BPOs, MSPs, and agencies.'},
 ...Object.fromEntries(products.map(p=>[productHref(p.slug),{title:`${p.name} | ${BRAND}`,description:p.description,...(SUBDOMAIN_CANONICAL[p.slug]?{canonical:SUBDOMAIN_CANONICAL[p.slug]}:{})}])),
 '/solutions/property-management-assistant':{title:`Property Management Assistant | ${BRAND}`,description:'When something goes wrong, everyone is notified. Explore PMA 24/7 emergency response coordination and maintenance intake pathways.',canonical:'https://pma.stellaruc.com/'},
 ...Object.fromEntries([['flow-authoring','Flow Design & Automation'],['governance-platform','Governance & Tenant Controls'],['intelligence-qa','Conversation Analytics & Quality'],['live-operations','Live Operations & Customer 360']].map(([slug,title])=>[`/platform/${slug}`,{title:`${title} | ${BRAND}`,description:`Explore ${title.toLowerCase()} within the customer engagement platform.`}])),
};
const origin='https://stellaruc.com';
export default function SearchMetadata(){
 const {pathname}=useRouter(); const page=pages[pathname];
 if(!page)return <Head><meta name="robots" content="noindex,follow" key="robots"/></Head>;
 const url=page.canonical||origin+pathname;
 const product=products.find(p=>productHref(p.slug)===pathname);
 const schema={'@context':'https://schema.org','@graph':[
  {'@type':'Organization','@id':origin+'/#organization',name:'Stellar Intelligent Technologies',url:origin+'/',logo:origin+'/apple-touch-icon.png',parentOrganization:{'@type':'Organization',name:'Apropos Group LLC',url:'https://aproposgroupllc.com/'}},
  {'@type':'WebSite','@id':origin+'/#website',name:BRAND,url:origin+'/',publisher:{'@id':origin+'/#organization'}},
  {'@type':'WebPage','@id':origin+pathname+'#webpage',url:origin+pathname,name:page.title,description:page.description,isPartOf:{'@id':origin+'/#website'},...(product?{about:{'@id':origin+pathname+'#service'}}:{})},
  ...(product?[{'@type':'Service','@id':origin+pathname+'#service',name:product.name,description:product.description,url:url,brand:{'@type':'Brand',name:BRAND},provider:{'@id':origin+'/#organization'}}]:[])
 ]};
 return <Head><title>{page.title}</title><meta name="description" content={page.description} key="description"/><meta name="robots" content="index,follow,max-image-preview:large" key="robots"/><link rel="canonical" href={url} key="canonical"/>
 <meta property="og:site_name" content={BRAND} key="og:site_name"/><meta property="og:type" content="website" key="og:type"/><meta property="og:title" content={page.title} key="og:title"/><meta property="og:description" content={page.description} key="og:description"/><meta property="og:url" content={url} key="og:url"/><meta property="og:locale" content="en_US" key="og:locale"/>
 <meta property="og:image" content={origin+'/stellar-intelligent-technologies-share.png'} key="og:image"/><meta property="og:image:alt" content={`${BRAND} — ${TAGLINE}`} key="og:image:alt"/><meta property="og:image:width" content="1200" key="og:image:width"/><meta property="og:image:height" content="630" key="og:image:height"/><meta name="twitter:image" content={origin+'/stellar-intelligent-technologies-share.png'} key="twitter:image"/><meta name="twitter:card" content="summary_large_image" key="twitter:card"/><meta name="twitter:title" content={page.title} key="twitter:title"/><meta name="twitter:description" content={page.description} key="twitter:description"/>
 <script type="application/ld+json" key="search-schema" dangerouslySetInnerHTML={{__html:JSON.stringify(schema).replace(/</g,'\\u003c')}}/></Head>
}
