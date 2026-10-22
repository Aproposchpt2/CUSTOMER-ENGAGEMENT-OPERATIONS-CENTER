/**
 * RUF-003: Stellar Sales product catalog ingestion
 * Seeds verified Stellar knowledge into ai4cc_knowledge_entries for the Sales Specialist.
 * Source: marketingProducts.ts (products 01-03) + salesFaqs.ts
 * All entries: source_status=VERIFIED, scope=product, publication_state=published
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { products } from './marketingProducts';
import { SALES_FAQS } from './salesFaqs';

export type SeedResult = { inserted: number; skipped: number; errors: string[] };

const STELLAR_TENANT_ID = process.env.CSS_TENANT_ID || '5885a020-d363-4c27-910a-c035eda132f5';

function productEntries() {
  return products.map((p) => ({
    tenant_id: STELLAR_TENANT_ID,
    title: `[PRODUCT] ${p.name}`,
    category: 'product',
    content: [
      `# ${p.name}`,
      `**Headline:** ${p.headline}`,
      `**Description:** ${p.description}`,
      `**Purpose:** ${p.purpose}`,
      `**Narrative:** ${p.narrative}`,
      '',
      '## Capabilities',
      ...p.capabilities.map(([cap, desc]: [string, string]) => `- **${cap}:** ${desc}`),
      '',
      '## How It Works',
      ...p.steps.map(([step, desc]: [string, string]) => `- **${step}:** ${desc}`),
      '',
      `## Product Relationship\n${p.relationship}`,
    ].join('\n'),
    tags: ['stellar', 'product', p.slug, p.category.toLowerCase().replace(/\s+/g, '-')],
    source_status: 'VERIFIED',
    scope: 'product',
    audience_scope: 'staff',
    publication_state: 'published',
    version_num: 1,
    effective_at: new Date().toISOString(),
  }));
}

function faqEntries() {
  return SALES_FAQS.map((faq, i) => ({
    tenant_id: STELLAR_TENANT_ID,
    title: `[FAQ] ${faq.question}`,
    category: 'scripts',
    content: `# Q: ${faq.question}\n\n**A:** ${faq.answer}`,
    tags: ['stellar', 'sales', 'faq', `faq-${i + 1}`],
    source_status: 'VERIFIED',
    scope: 'product',
    audience_scope: 'staff',
    publication_state: 'published',
    version_num: 1,
    effective_at: new Date().toISOString(),
  }));
}

export async function seedSalesKnowledge(
  supabase: SupabaseClient,
  opts: { dryRun?: boolean } = {}
): Promise<SeedResult> {
  const entries = [...productEntries(), ...faqEntries()];
  const result: SeedResult = { inserted: 0, skipped: 0, errors: [] };

  for (const entry of entries) {
    // Idempotent: skip if a VERIFIED entry with same title+tenant already exists
    const { data: existing } = await supabase
      .from('ai4cc_knowledge_entries')
      .select('id')
      .eq('tenant_id', entry.tenant_id)
      .eq('title', entry.title)
      .eq('source_status', 'VERIFIED')
      .maybeSingle();

    if (existing) { result.skipped++; continue; }
    if (opts.dryRun) { result.inserted++; continue; }

    const { error } = await supabase.from('ai4cc_knowledge_entries').insert(entry);
    if (error) { result.errors.push(`${entry.title}: ${error.message}`); }
    else { result.inserted++; }
  }

  return result;
}
