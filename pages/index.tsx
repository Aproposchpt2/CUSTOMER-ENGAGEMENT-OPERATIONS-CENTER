import Head from 'next/head';
import { useEffect } from 'react';

const PAGE_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=DM+Sans:wght@300;400;500;600&family=Syncopate:wght@400;700&display=swap');
:root{--ink:#050505;--panel:#101010;--gold:#C8A84B;--goldLight:#E4C878;--ivory:#F7F4EC;--body:#D3CEC1;--muted:#9E988B}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--ink)!important;color:var(--ivory)!important;font-family:'DM Sans',Arial,sans-serif!important;font-size:15px;line-height:1.65}a{text-decoration:none;color:var(--goldLight)}a:hover{color:var(--ivory)}.header{border-bottom:1px solid rgba(200,168,75,.23);background:#050505}.topline{max-width:1220px;margin:auto;display:flex;justify-content:space-between;gap:1rem;padding:7px 25px;color:var(--muted);font-family:'Syncopate',sans-serif;font-size:8px;letter-spacing:1px;border-bottom:1px solid rgba(200,168,75,.09)}.headerInner{max-width:1220px;margin:auto;padding:22px 25px;display:flex;align-items:center;justify-content:space-between;gap:24px}.wordmark{display:flex;flex-direction:column;line-height:1.18;min-width:255px}.wordmarkPrimary{font-family:'Cormorant Garamond',serif;font-size:34px;letter-spacing:.24em;font-weight:500;color:var(--ivory)}.wordmarkSecondary{font-family:'Syncopate',sans-serif;font-size:8px;letter-spacing:.16em;color:var(--goldLight)}.operator{font-size:10px;color:var(--muted);margin-top:7px}.nav{display:flex;gap:25px;flex-wrap:wrap}.nav a{color:var(--body);font-size:12px}.nav a:hover{color:var(--goldLight)}.headerLink{display:block;border:1px solid rgba(200,168,75,.6);padding:12px 18px;color:var(--goldLight);font-size:11px;white-space:nowrap}.hero{padding:105px 25px 60px;position:relative;background:radial-gradient(ellipse 70% 85% at 92% 22%,rgba(200,168,75,.10),transparent 72%),#050505}.heroInner{max-width:1100px;margin:auto}.overline,.eyebrow{display:block;font-family:'Syncopate',sans-serif;color:var(--goldLight);font-size:10px;letter-spacing:.11em;line-height:1.7}h1,h2,h3{font-family:'Cormorant Garamond',Georgia,serif;font-weight:500}.hero h1{max-width:980px;margin:26px 0;font-size:clamp(54px,7.3vw,112px);line-height:.97;letter-spacing:-.025em;color:var(--ivory)}h1 em,h2 em{color:var(--goldLight);font-weight:500}.heroLead{max-width:760px;color:var(--ivory);font-size:clamp(19px,2vw,24px);line-height:1.5;margin-bottom:18px}.heroCopy{max-width:780px;color:var(--body);font-size:15px;line-height:1.85}.actions{display:flex;gap:16px;flex-wrap:wrap;margin-top:33px}.primary,.secondary{display:inline-flex;gap:25px;justify-content:space-between;align-items:center;padding:16px 23px;font-size:12px;font-weight:600}.primary{background:var(--gold);color:#090909}.primary:hover{background:var(--goldLight);color:#090909}.secondary{border:1px solid rgba(200,168,75,.5);color:var(--goldLight)}.heroFoot{display:flex;align-items:center;flex-wrap:wrap;gap:20px;margin-top:95px;border-top:1px solid rgba(200,168,75,.24);padding-top:23px;color:var(--muted);font-family:'Syncopate',sans-serif;font-size:9px;letter-spacing:.09em}.goldPlus{color:var(--gold);font-size:20px}.section{max-width:1150px;margin:auto;padding:100px 25px}.sectionHeading{display:grid;grid-template-columns:1.5fr 1fr;align-items:end;gap:50px;margin-bottom:42px}.sectionHeading h2,.contrastInner h2,.flowInner h2,.closing h2{font-size:clamp(40px,5vw,68px);line-height:1.04;color:var(--ivory);margin:17px 0 0}.sectionHeading p{font-size:15px;line-height:1.8;color:var(--body);max-width:410px}.reasonGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.reasonCard{background:#101010;border:1px solid rgba(200,168,75,.22);padding:28px 25px 37px;min-height:275px}.cardNumber{font-family:'Cormorant Garamond',serif;font-size:32px;color:var(--gold)}.reasonCard h3{font-size:30px;line-height:1.03;margin:37px 0 15px;color:var(--ivory)}.reasonCard p,.productCard p{font-size:13px;line-height:1.8;color:var(--body)}.contrastSection{background:#0A0A0A;border-top:1px solid rgba(200,168,75,.15);border-bottom:1px solid rgba(200,168,75,.15)}.contrastInner{max-width:1150px;margin:auto;padding:112px 25px}.contrastInner h2{max-width:1000px;font-size:clamp(44px,5.7vw,76px)}.quoteRule{width:70px;height:2px;background:var(--gold);margin:34px 0}.contrastInner>p{max-width:790px;line-height:1.85;color:var(--body);font-size:16px}.modelGrid{display:grid;grid-template-columns:1fr 1fr;gap:22px;margin-top:44px}.modelGrid>div{padding:32px;border:1px solid rgba(200,168,75,.18);background:#111}.modelGrid span,.productLabel{font-family:'Syncopate',sans-serif;font-size:9px;color:var(--goldLight);letter-spacing:.08em}.modelGrid h3{font-size:38px;line-height:1.1;margin:16px 0}.modelGrid p{font-size:14px;color:var(--body);line-height:1.75}.productGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:15px}.productCard{background:#101010;border:1px solid rgba(200,168,75,.28);padding:30px;display:flex;flex-direction:column;min-height:405px}.productTop{display:flex;gap:16px;justify-content:space-between;align-items:center}.productTop>span:first-child{font-family:'Cormorant Garamond',serif;font-size:37px;color:var(--goldLight)}.productCard h3{font-size:clamp(30px,3vw,40px);line-height:1.05;margin:30px 0 16px;min-height:90px}.productDetail{margin-top:auto;padding-top:25px;font-size:12px;color:var(--goldLight);line-height:1.6}.productLink{border-top:1px solid rgba(200,168,75,.2);padding-top:18px;display:flex;justify-content:space-between;gap:10px;color:var(--goldLight);font-size:12px;margin-top:20px}.flowSection{background:#0A0A0A}.flowInner{max-width:1150px;margin:auto;padding:90px 25px}.flowGrid{display:grid;grid-template-columns:repeat(4,1fr);margin-top:48px;gap:12px}.flowStep{border-top:1px solid rgba(200,168,75,.45);padding:23px 15px 18px 0;display:flex;flex-direction:column;gap:24px}.flowStep span{color:var(--gold);font-family:'Cormorant Garamond',serif;font-size:34px}.flowStep strong{font-size:17px;font-weight:500;line-height:1.45;color:var(--ivory)}.questions{border-top:1px solid rgba(200,168,75,.28)}.questions p{font-family:'Cormorant Garamond',serif;font-size:clamp(25px,3vw,35px);line-height:1.18;padding:24px 0;border-bottom:1px solid rgba(200,168,75,.22);color:var(--ivory)}.closing{text-align:center;background:#0A0A0A;padding:90px 25px 100px;border-top:1px solid rgba(200,168,75,.2)}.closing h2{max-width:850px;margin:24px auto;font-size:clamp(43px,6vw,76px)}.closing p{max-width:650px;margin:0 auto 29px;font-size:15px;color:var(--body);line-height:1.8}.footer{border-top:1px solid rgba(200,168,75,.25);max-width:1150px;margin:auto;padding:34px 25px 50px;display:flex;justify-content:space-between;gap:25px}.footer>div{display:flex;flex-direction:column;gap:8px}.footer strong{font-family:'Syncopate',sans-serif;color:var(--goldLight);font-size:11px;letter-spacing:.08em}.footer span,.footer a{font-size:12px;color:var(--muted)}@media(max-width:980px){.headerInner{flex-wrap:wrap}.nav{order:3;width:100%}.sectionHeading{grid-template-columns:1fr;gap:15px}.reasonGrid{grid-template-columns:repeat(2,1fr)}.productGrid{grid-template-columns:1fr}.productCard{min-height:unset}.productCard h3{min-height:unset}.flowGrid{grid-template-columns:repeat(2,1fr)}}@media(max-width:580px){.hero{padding-top:75px}.hero h1{font-size:56px}.section,.contrastInner,.flowInner{padding-top:65px;padding-bottom:65px}.reasonGrid,.modelGrid,.flowGrid{grid-template-columns:1fr}.reasonCard{min-height:unset}.reasonCard h3{margin-top:18px}.headerLink{width:100%;text-align:center}.footer{flex-direction:column}.heroFoot{gap:11px}.topline{font-size:7px}}.heroBrandLine{color:#E4C878;font-family:"Syncopate",Arial,sans-serif!important;font-size:clamp(12px,1.45vw,18px);letter-spacing:.12em;line-height:1.6;margin:24px 0 30px;font-weight:500}@media(max-width:580px){.heroBrandLine{letter-spacing:.06em}}
.modelGrid h3{font-size:clamp(27px,3.1vw,38px);overflow-wrap:break-word}
.intelligence-showcase{border:1px solid rgba(200,168,75,.35);background:#0a0a0a;overflow:hidden}.showcase-tabs{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border-bottom:1px solid rgba(200,168,75,.3)}.showcase-tab{appearance:none;border:0;border-right:1px solid rgba(200,168,75,.18);background:#101010;color:var(--ivory);text-align:left;padding:22px 22px 25px;cursor:pointer;display:flex;flex-direction:column;gap:18px;min-height:165px;font-family:'Cormorant Garamond',serif;font-size:clamp(20px,2.3vw,30px);line-height:1.05;position:relative;transition:background .25s,box-shadow .25s}.showcase-tab:last-child{border-right:0}.showcase-tab:hover,.showcase-tab:focus-visible{background:#1b180f;outline:1px solid var(--gold)}.showcase-tab.is-active{background:linear-gradient(140deg,#1c180e,#0c0c0c);box-shadow:inset 0 3px var(--goldLight)}.tab-index{font:10px 'Syncopate',sans-serif;color:var(--goldLight)}.tab-arrow{position:absolute;right:18px;top:18px;font:19px 'DM Sans',sans-serif;color:var(--goldLight)}.showcase-stage{padding:30px 34px 20px;min-height:380px}.showcase-head,.showcase-footer{display:flex;justify-content:space-between;align-items:center;gap:15px;flex-wrap:wrap}.showcase-status,.showcase-footer{font:9px 'Syncopate',sans-serif;letter-spacing:.07em;color:var(--muted)}.pulse-dot{display:inline-block;width:7px;height:7px;background:var(--goldLight);border-radius:50%;margin-right:8px;box-shadow:0 0 0 0 rgba(228,200,120,.5);animation:capPulse 2s infinite}@keyframes capPulse{70%{box-shadow:0 0 0 9px rgba(228,200,120,0)}}.showcase-body{display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr);gap:35px;align-items:center;padding:30px 0}.showcase-narrative h3{font-size:clamp(35px,4vw,55px);line-height:1.02;margin:0 0 18px}.showcase-narrative p{color:var(--body);line-height:1.85;max-width:400px}.showcase-narrative small{display:block;color:var(--muted);font-size:10px;margin-top:16px}.showcase-run{background:transparent;color:var(--goldLight);border:1px solid rgba(200,168,75,.55);padding:12px 16px;cursor:pointer;font:12px 'DM Sans',sans-serif;margin-top:14px}.showcase-run:hover{background:rgba(200,168,75,.13)}.showcase-display{min-height:265px;border:1px solid rgba(200,168,75,.25);background:radial-gradient(circle at 75% 20%,rgba(200,168,75,.08),transparent 60%),#080808;padding:22px;display:flex;flex-direction:column;justify-content:center;gap:12px}.demo-line{border:1px solid rgba(200,168,75,.22);padding:13px 15px;background:#121212;animation:demoEnter .5s both;opacity:1}.demo-line:nth-child(2){animation-delay:.22s}.demo-line:nth-child(3){animation-delay:.44s}.demo-line:nth-child(4){animation-delay:.66s}@keyframes demoEnter{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}.demo-kicker{display:block;font:9px 'Syncopate',sans-serif;color:var(--goldLight);letter-spacing:.07em;margin-bottom:7px}.demo-copy{font-size:13px;color:var(--ivory);line-height:1.55}.demo-progress{height:3px;background:#302a1c;margin-top:12px;overflow:hidden}.demo-progress:before{content:'';display:block;width:100%;height:100%;background:var(--goldLight);transform-origin:left;animation:demoGrow 1.6s both}@keyframes demoGrow{from{transform:scaleX(0)}to{transform:scaleX(1)}}.showcase-footer{border-top:1px solid rgba(200,168,75,.2);padding-top:17px}@media(max-width:760px){.showcase-tabs{grid-template-columns:repeat(2,minmax(0,1fr))}.showcase-tab{min-height:125px;padding:18px;font-size:23px}.showcase-tab:nth-child(2){border-right:0}.showcase-tab:nth-child(-n+2){border-bottom:1px solid rgba(200,168,75,.18)}.showcase-body{grid-template-columns:1fr;gap:20px}.showcase-stage{padding:24px 18px}.showcase-display{min-height:200px}.showcase-status{font-size:8px}}@media(prefers-reduced-motion:reduce){.pulse-dot,.demo-line,.demo-progress:before{animation:none!important}}
.presence-orb{position:fixed;right:24px;bottom:24px;z-index:60;width:66px;height:66px;border-radius:50%;border:1px solid var(--goldLight);background:var(--panel);color:var(--goldLight);font:600 11px 'DM Sans',sans-serif;cursor:pointer;box-shadow:0 0 0 8px rgba(200,168,75,.08),0 16px 48px #0009;animation:presencePulse 3s infinite}.presence-orb span{display:block;font-size:23px}.presence-tip{position:fixed;right:102px;bottom:33px;z-index:59;max-width:250px;padding:13px 17px;border:1px solid rgba(200,168,75,.5);border-radius:16px 16px 3px 16px;background:var(--panel);color:var(--ivory);font-size:12px;box-shadow:0 14px 40px #0008;animation:tipEnter .7s both}.presence-tip button{background:none;border:0;color:var(--goldLight);cursor:pointer;margin-left:9px}.presence-drawer{position:fixed;z-index:90;top:0;right:0;width:min(430px,100vw);height:100dvh;background:#101010;border-left:1px solid var(--gold);box-shadow:-25px 0 75px #000b;transform:translateX(105%);transition:transform .4s ease;display:flex;flex-direction:column}.presence-drawer.open{transform:translateX(0)}.drawer-head{padding:25px;border-bottom:1px solid #c8a84b55;display:flex;justify-content:space-between;align-items:start}.drawer-head strong{display:block;color:var(--goldLight);font-family:'Syncopate',sans-serif;font-size:11px;letter-spacing:.1em}.drawer-head small{color:var(--body)}.drawer-close{border:1px solid #c8a84b66;background:transparent;color:var(--ivory);padding:8px 12px;cursor:pointer}.drawer-body{padding:24px;overflow-y:auto;flex:1}.chat-bubble{padding:15px 18px;margin:12px 0;border-radius:15px;background:#1b1b1b;border:1px solid #c8a84b33;color:var(--ivory);font-size:14px}.chat-bubble.user{margin-left:30px;background:#292312}.chat-options{display:grid;gap:10px;margin-top:20px}.chat-options button,.drawer-cta{background:transparent;border:1px solid #c8a84b88;color:var(--goldLight);padding:14px;text-align:left;cursor:pointer;font:inherit}.chat-options button:hover,.drawer-cta:hover{background:#c8a84b20}.drawer-cta{display:block;margin-top:22px;text-align:center}.presence-scrim{position:fixed;inset:0;background:#0009;z-index:80;display:none}.presence-scrim.open{display:block}.presence-status{display:flex;align-items:center;gap:10px;color:var(--body);font-size:12px;margin:18px 0}.presence-dot{height:9px;width:9px;background:var(--goldLight);border-radius:50%;box-shadow:0 0 0 5px #c8a84b20;animation:presencePulse 2s infinite}.reasonCard,.productCard,.modelGrid>div{transition:transform .35s,border-color .35s,box-shadow .35s}.reasonCard:hover,.productCard:hover,.modelGrid>div:hover{transform:translateY(-7px);border-color:var(--gold);box-shadow:0 20px 45px #0008}.hero::after{content:'';position:absolute;right:8%;top:15%;width:220px;height:220px;border:1px solid #c8a84b24;border-radius:50%;box-shadow:0 0 0 45px #c8a84b06,0 0 0 90px #c8a84b04;pointer-events:none;animation:orbitFloat 8s ease-in-out infinite}.heroInner{position:relative;z-index:1}.presence-rail{position:fixed;left:0;top:42%;z-index:25;writing-mode:vertical-rl;transform:rotate(180deg);padding:16px 9px;background:#101010;border:1px solid #c8a84b44;border-left:0;font:9px 'Syncopate',sans-serif;letter-spacing:.14em;color:var(--goldLight)}.reveal{opacity:0;transform:translateY(20px);transition:opacity .7s,transform .7s}.reveal.visible{opacity:1;transform:none}@keyframes presencePulse{50%{box-shadow:0 0 0 13px #c8a84b06,0 16px 48px #0009}}@keyframes orbitFloat{50%{transform:translateY(25px) rotate(10deg)}}@keyframes tipEnter{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}@media(max-width:580px){.presence-rail,.hero::after{display:none}.presence-orb{right:16px;bottom:16px}.presence-tip{right:90px;bottom:22px;max-width:190px}}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important}.reveal{opacity:1;transform:none}}
.heroIdentity{margin:0 0 48px;padding:0 0 34px;border-bottom:1px solid rgba(200,168,75,.27)}.heroCompany{font-family:"Cormorant Garamond",Georgia,serif;color:var(--ivory);font-weight:500;font-size:clamp(54px,7.3vw,112px);line-height:.97;letter-spacing:-.025em;overflow-wrap:break-word}.heroCompany span{display:block;color:var(--goldLight);font:inherit;letter-spacing:inherit;margin-top:8px}.heroOperator{font-family:"DM Sans",Arial,sans-serif;font-size:12px;color:var(--muted);margin-top:16px;letter-spacing:.07em}.hero .overline{margin-bottom:22px}.hero h1{font-size:clamp(44px,6.1vw,90px)}@media(max-width:580px){.heroIdentity{margin-bottom:36px;padding-bottom:25px}.heroCompany{font-size:clamp(48px,9vw,64px)}.heroCompany span{font-size:inherit}.hero h1{font-size:clamp(42px,9vw,58px)}}
`;

export default function HomePage() {
  useEffect(() => {
    // Presence drawer + topic answers + scroll reveal
    (function () {
      const d = document.getElementById('presenceDrawer');
      const s = document.getElementById('presenceScrim');
      const o = document.getElementById('presenceOpen');
      const c = document.getElementById('presenceClose');
      const m = document.getElementById('presenceMessages');
      if (!d || !s || !o || !c || !m) return;
      let lastFocus: Element | null = null;
      function toggle(open: boolean) {
        d!.classList.toggle('open', open);
        s!.classList.toggle('open', open);
        d!.setAttribute('aria-hidden', String(!open));
        document.body.style.overflow = open ? 'hidden' : '';
        if (open) {
          lastFocus = document.activeElement;
          c!.focus();
          document.getElementById('presenceTip')?.remove();
        } else {
          (lastFocus as HTMLElement | null)?.focus?.();
        }
      }
      o.addEventListener('click', () => toggle(true));
      c.addEventListener('click', () => toggle(false));
      s.addEventListener('click', () => toggle(false));
      document.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Escape' && d!.classList.contains('open')) toggle(false);
        if (e.key === 'Tab' && d!.classList.contains('open')) {
          const f = [...d!.querySelectorAll<HTMLElement>('button,a[href]')];
          if (e.shiftKey && document.activeElement === f[0]) {
            e.preventDefault(); f[f.length - 1].focus();
          } else if (!e.shiftKey && document.activeElement === f[f.length - 1]) {
            e.preventDefault(); f[0].focus();
          }
        }
      });
      const answers: Record<string, [string, string]> = {
        sales: ['Sales Specialist', 'An intelligent first line can receive inbound inquiries, capture relevant details and support a clear next step—even outside traditional business hours.'],
        support: ['Support Specialist', 'A conversational support experience can collect service needs, coordinate approved workflows and help customers understand what happens next.'],
        platform: ['Customer Engagement Operations Center', 'The platform concept connects customer conversations, records, tasks and human follow-through into a coordinated operational view.'],
        workforce: ['The New Age Workforce', 'Technology handles defined, predictable activities while employees focus on judgment, relationships, complex issues and growth.'],
      };
      document.querySelectorAll<HTMLButtonElement>('[data-topic]').forEach(b => b.addEventListener('click', () => {
        const [q, a] = answers[b.dataset.topic as string] ?? ['', ''];
        m!.insertAdjacentHTML('beforeend', '<div class="chat-bubble user"></div><div class="chat-bubble"></div>');
        (m!.lastElementChild!.previousElementSibling as HTMLElement).textContent = q;
        (m!.lastElementChild as HTMLElement).textContent = a;
        m!.lastElementChild!.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }));
      if ('IntersectionObserver' in window) {
        const obs = new IntersectionObserver(es => es.forEach(e => {
          if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); }
        }), { threshold: 0.1 });
        document.querySelectorAll('.reasonCard,.productCard,.flowStep,.modelGrid>div').forEach(el => {
          el.classList.add('reveal'); obs.observe(el);
        });
      }
    })();

    // Showcase tab switcher
    (function () {
      interface Cap { label: string; title: string; desc: string; lines: [string, string][]; }
      const data: Record<string, Cap> = {
        response: { label: '01 / INTELLIGENT ENGAGEMENT', title: 'Your business stays responsive.', desc: 'Customers expect meaningful answers and clear next steps, even when your team is occupied or your office is closed.', lines: [['INCOMING INQUIRY', 'Hello, can I request an estimate?'], ['INTELLIGENT RESPONSE', 'Absolutely. I can collect the details your team needs.'], ['STRUCTURED INTAKE', 'Contact details and project requirements collected.'], ['HUMAN HANDOFF', 'Request organized for sales follow-up.']] },
        workforce: { label: '02 / WORKFORCE ALIGNMENT', title: 'Technology handles the predictable.', desc: 'Assign defined, repeatable activities to intelligent systems while your people focus on judgment, relationships and exceptional situations.', lines: [['RECURRING ACTIVITY', 'Routine inquiries and structured intake'], ['INTELLIGENT SYSTEM', 'Handles approved, repeatable steps'], ['HUMAN EXPERTISE', 'Complex decisions and personal relationships'], ['ALIGNED WORKFORCE', 'Each responsibility goes where it belongs']] },
        operations: { label: '03 / OPERATIONAL CONTINUITY', title: 'From conversation to coordinated action.', desc: 'Connect incoming requests, approved workflows and human follow-up so important customer work does not disappear between systems.', lines: [['01 / RECEIVE', 'Customer request enters the operation'], ['02 / CLASSIFY', 'Identify the appropriate service workflow'], ['03 / COORDINATE', 'Prepare task and relevant context'], ['04 / FOLLOW UP', 'Route the next step to the responsible team']] },
        cost: { label: '04 / EFFICIENT COST STRUCTURES', title: 'A more intentional use of resources.', desc: 'Explore how reallocating recurring work may reduce avoidable overhead while maintaining human oversight and service quality.', lines: [['IDENTIFY', 'Map high-volume recurring work'], ['REASSIGN', 'Use intelligent systems for approved tasks'], ['REFOCUS', 'Reserve staff time for higher-value work'], ['EVALUATE', 'Review actual usage, service quality and costs']] },
      };
      const tabs = [...document.querySelectorAll<HTMLButtonElement>('.showcase-tab')];
      const display = document.getElementById('capDisplay');
      if (!tabs.length || !display) return;
      let current = 'response';
      function render(key: string) {
        current = key;
        const d = data[key];
        const keys = Object.keys(data);
        tabs.forEach(t => { const active = t.dataset.cap === key; t.classList.toggle('is-active', active); t.setAttribute('aria-selected', String(active)); });
        const el = (id: string) => document.getElementById(id);
        const cl = el('capLabel'); if (cl) cl.textContent = d.label;
        const ct = el('capTitle'); if (ct) ct.textContent = d.title;
        const cd = el('capDesc'); if (cd) cd.textContent = d.desc;
        const cc = el('capCounter'); if (cc) cc.textContent = String(keys.indexOf(key) + 1).padStart(2, '0') + ' — 04';
        display.replaceChildren(...d.lines.map(([k, v]) => {
          const node = document.createElement('div'); node.className = 'demo-line';
          const a = document.createElement('span'); a.className = 'demo-kicker'; a.textContent = k;
          const b = document.createElement('div'); b.className = 'demo-copy'; b.textContent = v;
          node.append(a, b); return node;
        }));
      }
      tabs.forEach((tab, i) => {
        tab.addEventListener('click', () => render(tab.dataset.cap!));
        tab.addEventListener('keydown', (e: KeyboardEvent) => {
          if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
            e.preventDefault();
            const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
            next.focus(); render(next.dataset.cap!);
          }
        });
      });
      const run = document.getElementById('capRun');
      if (run) run.addEventListener('click', () => render(current));
      render(current);
    })();
  }, []);

  return (
    <>
      <Head>
        <title>Stellar Intelligent Technologies</title>
        <meta name="description" content="Human intelligence and intelligent technology working together. Discover how Stellar Intelligent Technologies is redefining the work for modern businesses." />
        <style dangerouslySetInnerHTML={{ __html: PAGE_CSS }} />
      </Head>

      <header className="header">
        <div className="headerInner">
          <a className="wordmark" href="#top">
            <span className="wordmarkPrimary">STELLAR</span>
            <span className="wordmarkSecondary">INTELLIGENT TECHNOLOGIES</span>
            <span className="operator">Operated by Apropos Group LLC</span>
          </a>
          <nav className="nav" aria-label="Main navigation">
            <a href="#why">Why the Shift</a>
            <a href="#model">New Age Workforce</a>
            <a href="#products">Three Solutions</a>
            <a href="#questions">Questions</a>
          </nav>
          <a className="headerLink" href="/intake">Explore the Possibilities ↗</a>
        </div>
      </header>

      <main id="top">
        <section className="hero">
          <div className="heroInner">
            <div className="heroIdentity">
              <div className="heroCompany">STELLAR <span>INTELLIGENT TECHNOLOGIES</span></div>
              <div className="heroOperator">Operated by Apropos Group LLC</div>
            </div>
            <div className="overline">THE FUTURE OF BUSINESS · REDEFINING THE WORK</div>
            <h1>TECHNOLOGY HANDLES THE PREDICTABLE.<br /><em>STAFF HANDLE THE EXCEPTIONAL.</em></h1>
            <p className="heroLead">Human intelligence and intelligent technology are beginning to work together in a different way.</p>
            <p className="heroCopy">The opportunity is not simply to automate more. It is to reconsider how work gets done—allowing intelligent systems to support recurring responsibilities while employees focus on judgment, relationships, creativity, and business growth.</p>
            <div className="actions">
              <a className="primary" href="#why">Understand the Shift <span>↘</span></a>
              <a className="secondary" href="#products">Explore the Three Systems <span>→</span></a>
            </div>
            <div className="heroFoot">
              <span>PEOPLE</span>
              <span className="goldPlus">+</span>
              <span>INTELLIGENT SYSTEMS</span>
              <span className="goldPlus">=</span>
              <span>A MORE RESPONSIVE OPERATION</span>
            </div>
          </div>
        </section>

        <section className="section" id="why">
          <div className="sectionHeading">
            <div>
              <span className="eyebrow">01 · UNDERSTANDING THE CHANGE</span>
              <h2>The shift is already <em>underway.</em></h2>
            </div>
            <p>Businesses are rethinking which responsibilities require human attention—and which can be supported reliably by intelligent technology.</p>
          </div>
          <div className="intelligence-showcase" aria-label="Explore intelligent technology capabilities">
            <div className="showcase-tabs" role="tablist" aria-label="Technology capabilities">
              <button className="showcase-tab is-active" type="button" role="tab" aria-selected="true" data-cap="response">
                <span className="tab-index">01</span>
                <span>Always-on<br />responsiveness</span>
                <span className="tab-arrow">↗</span>
              </button>
              <button className="showcase-tab" type="button" role="tab" aria-selected="false" data-cap="workforce">
                <span className="tab-index">02</span>
                <span>Workforce<br />alignment</span>
                <span className="tab-arrow">↗</span>
              </button>
              <button className="showcase-tab" type="button" role="tab" aria-selected="false" data-cap="operations">
                <span className="tab-index">03</span>
                <span>Operational<br />continuity</span>
                <span className="tab-arrow">↗</span>
              </button>
              <button className="showcase-tab" type="button" role="tab" aria-selected="false" data-cap="cost">
                <span className="tab-index">04</span>
                <span>Efficient cost<br />structures</span>
                <span className="tab-arrow">↗</span>
              </button>
            </div>
            <div className="showcase-stage" id="showcaseStage" role="tabpanel" aria-live="polite">
              <div className="showcase-head">
                <span className="eyebrow" id="capLabel">01 / INTELLIGENT ENGAGEMENT</span>
                <span className="showcase-status"><span className="pulse-dot"></span> INTERACTIVE DEMONSTRATION</span>
              </div>
              <div className="showcase-body">
                <div className="showcase-narrative">
                  <h3 id="capTitle">Your business stays responsive.</h3>
                  <p id="capDesc">Customers expect meaningful answers and clear next steps, even when your team is occupied or your office is closed.</p>
                  <button type="button" className="showcase-run" id="capRun">Replay demonstration <span>↗</span></button>
                  <small>Illustrative interface · Not connected to live customer systems</small>
                </div>
                <div className="showcase-display" id="capDisplay" aria-label="Animated capability demonstration"></div>
              </div>
              <div className="showcase-footer">
                <span>STELLAR / INTELLIGENT TECHNOLOGY</span>
                <span id="capCounter">01 — 04</span>
              </div>
            </div>
          </div>
        </section>

        <section className="contrastSection" id="model">
          <div className="contrastInner">
            <span className="eyebrow">02 · A NEW MODEL FOR WORK</span>
            <h2>It isn&apos;t about replacing people. <em>It&apos;s about redefining responsibilities.</em></h2>
            <div className="quoteRule"></div>
            <p>The most valuable contribution of intelligent technology is not imitation of the human workforce. It is handling defined, repeatable activities so people can concentrate on what requires human understanding.</p>
            <div className="modelGrid">
              <div>
                <span>INTELLIGENT SYSTEMS</span>
                <h3>TECHNOLOGY HANDLES THE PREDICTABLE.</h3>
                <p>Routine inquiries, structured intake, recurring workflows, and approved operational tasks.</p>
              </div>
              <div>
                <span>YOUR PEOPLE</span>
                <h3>STAFF HANDLE THE EXCEPTIONAL.</h3>
                <p>Complex decisions, customer relationships, creative problem-solving, and strategic opportunities requiring human judgment.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="products">
          <div className="sectionHeading">
            <div>
              <span className="eyebrow">03 · THE STELLAR INTELLIGENT TECHNOLOGIES SUITE</span>
              <h2>Three systems. <em>One direction.</em></h2>
            </div>
            <p>From the intelligent platform to sales and support engagement, each system has a distinct responsibility within the customer lifecycle.</p>
          </div>
          <div className="productGrid">
            <article className="productCard">
              <div className="productTop">
                <span>01</span>
                <span className="productLabel">THE CONNECTED PLATFORM</span>
              </div>
              <h3>Customer Engagement Operations Center</h3>
              <p>The operating environment that connects customer records, conversations, work assignments, and the people responsible for the next step.</p>
              <div className="productDetail">One coordinated view across customer engagement, sales, and support.</div>
              <a className="productLink" href="/intake">Discuss this system <span>↗</span></a>
            </article>
            <article className="productCard">
              <div className="productTop">
                <span>02</span>
                <span className="productLabel">INTELLIGENT SALES ENGAGEMENT</span>
              </div>
              <h3>Sales Specialist</h3>
              <p>An intelligent front line for inbound customer inquiries, lead intake, approved answers, and the follow-up context your team needs.</p>
              <div className="productDetail">Your business may close. Your sales operation can remain available.</div>
              <a className="productLink" href="/intake">Discuss this system <span>↗</span></a>
            </article>
            <article className="productCard">
              <div className="productTop">
                <span>03</span>
                <span className="productLabel">INTELLIGENT CUSTOMER SUPPORT</span>
              </div>
              <h3>Support Specialist</h3>
              <p>An intelligent support intake and coordination service that helps customers explain their needs while verified tasks move through the operating workflow.</p>
              <div className="productDetail">Natural conversation. Verified service outcomes.</div>
              <a className="productLink" href="/intake">Discuss this system <span>↗</span></a>
            </article>
          </div>
        </section>

        <section className="section">
          <div className="sectionHeading">
            <div>
              <span className="eyebrow">04 · THE PLATFORM BEHIND IT</span>
              <h2>Four capabilities. <em>One intelligent foundation.</em></h2>
            </div>
            <p>The technology that makes each specialist system work — from call flow design to live operations and quality intelligence.</p>
          </div>
          <div className="reasonGrid">
            {[
              { href: '/platform/flow-authoring', num: '01', name: 'Flow Authoring', desc: 'Build call logic without writing code. AI script builder, visual flow designer, simulation and versioning.' },
              { href: '/platform/governance-platform', num: '02', name: 'Governance Platform', desc: 'Multi-tenant access control and role-based permissions built into the data model from the start.' },
              { href: '/platform/intelligence-qa', num: '03', name: 'Intelligence & QA', desc: 'Analytics, transcript intelligence, QA scoring and agent coaching across every interaction.' },
              { href: '/platform/live-operations', num: '04', name: 'Live Operations', desc: 'Unified agent workspace for voice, SMS and web chat. One screen with full context.' },
            ].map(p => (
              <div key={p.href} className="reasonCard">
                <div className="cardNumber">{p.num}</div>
                <h3>{p.name}</h3>
                <p>{p.desc}</p>
                <a href={p.href} style={{ display: 'block', marginTop: '22px', fontSize: '11px', letterSpacing: '.07em', fontFamily: "'Syncopate',sans-serif", color: 'var(--goldLight)' }}>EXPLORE CAPABILITY ↗</a>
              </div>
            ))}
          </div>
        </section>

        <section className="flowSection">
          <div className="flowInner">
            <span className="eyebrow">05 · PRACTICAL WORKFORCE ALIGNMENT</span>
            <h2>From traditional workflows to <em>intelligent execution.</em></h2>
            <div className="flowGrid">
              <div className="flowStep"><span>01</span><strong>Identify recurring work</strong></div>
              <div className="flowStep"><span>02</span><strong>Establish approved business rules</strong></div>
              <div className="flowStep"><span>03</span><strong>Assign defined tasks to intelligent systems</strong></div>
              <div className="flowStep"><span>04</span><strong>Keep people informed and in control</strong></div>
            </div>
          </div>
        </section>

        <section className="section" id="questions">
          <div className="sectionHeading">
            <div>
              <span className="eyebrow">06 · QUESTIONS WORTH ASKING</span>
              <h2>Is your business ready to <em>redefine the work?</em></h2>
            </div>
            <p>The right starting point is understanding existing workflows and deciding where intelligence can support better customer experiences.</p>
          </div>
          <div className="questions">
            <p>What happens when a customer reaches your business after hours?</p>
            <p>Which routine responsibilities take your employees away from higher-value work?</p>
            <p>Could your sales and support teams benefit from better continuity and context?</p>
          </div>
        </section>

        <section className="closing">
          <span className="eyebrow">DISCOVER THE POSSIBILITIES</span>
          <h2>A more responsive business begins with <em>a different approach to work.</em></h2>
          <p>Explore how intelligent customer engagement, sales, and support systems can complement the people who drive your business forward.</p>
          <a className="primary" href="/intake">Learn About Stellar&apos;s Approach <span>↗</span></a>
        </section>
      </main>

      <footer className="footer">
        <div>
          <strong>STELLAR INTELLIGENT TECHNOLOGIES</strong>
          <span>Operated by Apropos Group LLC</span>
        </div>
        <div>
          <span>Premium Presence before Persuasion.</span>
          <a href="/intake">Start a conversation ↗</a>
        </div>
      </footer>

      <div className="presence-rail" aria-hidden="true">APROPOS PREMIUM PRESENCE · INTELLIGENT ENGAGEMENT</div>
      <div className="presence-tip" id="presenceTip">
        Explore how intelligent engagement works{' '}
        <button aria-label="Dismiss message" onClick={() => document.getElementById('presenceTip')?.remove()}>×</button>
      </div>
      <button className="presence-orb" id="presenceOpen" aria-label="Open intelligent engagement experience">
        <span>✧</span>ASK
      </button>
      <div className="presence-scrim" id="presenceScrim"></div>
      <aside className="presence-drawer" id="presenceDrawer" role="dialog" aria-modal={true} aria-label="Stellar interactive experience" aria-hidden={true}>
        <div className="drawer-head">
          <div>
            <strong>STELLAR INTELLIGENCE</strong>
            <small>Interactive experience · guided demonstration</small>
          </div>
          <button className="drawer-close" id="presenceClose" aria-label="Close panel">✕</button>
        </div>
        <div className="drawer-body">
          <div className="presence-status"><span className="presence-dot"></span> Explore the New Age Workforce</div>
          <div id="presenceMessages" aria-live="polite">
            <div className="chat-bubble">Welcome to STELLAR INTELLIGENT TECHNOLOGIES. Discover how intelligent systems and people can work together.</div>
            <div className="chat-bubble">What would you like to explore?</div>
          </div>
          <div className="chat-options" id="presenceOptions">
            <button data-topic="sales">How can intelligent sales engagement help?</button>
            <button data-topic="support">What does the Support Specialist do?</button>
            <button data-topic="platform">How does the Operations Center connect work?</button>
            <button data-topic="workforce">What is the New Age Workforce?</button>
          </div>
          <a className="drawer-cta" href="/intake">Explore a Business Consultation ↗</a>
          <p style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '18px' }}>This is an interactive educational preview, not a live AI agent or customer service channel.</p>
        </div>
      </aside>
    </>
  );
}
