'use strict';

// SAFE-001..008 deterministic safety overrides per Master Intent Catalog v1.0.
// Scans caller transcript text for life-safety signals.
// Returns { intentId, intent, script } on first match, null otherwise.
// Patterns lean toward recall; false positives are resolved by the
// "are you safe right now?" follow-up embedded in every script.

const SAFE_RULES = [
  {
    intentId: 'SAFE-001',
    intent: 'EMERGENCY_GAS_LEAK',
    patterns: [
      /\b(smell|smelling|detect(ed)?|notice[d]?|there'?s|there\s+is)\s+(a\s+)?(gas|natural\s+gas)\b/i,
      /\bgas\s+(leak|smell|odor|coming)\b/i,
      /\brotten\s*egg/i,
      /\bsulfur\s+(smell|odor)\b/i,
    ],
    script: 'If you smell gas, leave the building immediately. Do not turn any switches on or off, and do not use your phone inside. Call 911 and your gas company from outside or a safe location away from the building. Do not re-enter until emergency services clear the area.',
  },
  {
    intentId: 'SAFE-002',
    intent: 'EMERGENCY_CO_ALARM',
    patterns: [
      /\bco\s+(alarm|detector|alert|going\s+off|triggered)\b/i,
      /\bcarbon\s+monoxide\b/i,
    ],
    script: 'Leave the building immediately. Do not stop for belongings. Call 911 from outside or a neighbor\'s location. Do not re-enter until emergency authorities say it is safe.',
  },
  {
    intentId: 'SAFE-003',
    intent: 'EMERGENCY_FIRE',
    patterns: [
      /\b(there'?s|there\s+is|i\s+(can\s+)?see|seeing)\s+(a\s+)?fire\b/i,
      /\b(house|building|unit|room|office|apartment|facility)\s+(is\s+)?on\s+fire\b/i,
      /\bvisible\s+fire\b/i,
      /\bfire\s+is\s+(spread|out\s+of\s+control)\b/i,
      /\bflames?\s+(everywhere|visible|coming|spreading)\b/i,
    ],
    script: 'If there is a fire, move away from the area immediately and call 911. Do not attempt to fight the fire yourself. Get to a safe location outside.',
  },
  {
    intentId: 'SAFE-004',
    intent: 'EMERGENCY_SMOKE',
    patterns: [
      /\b(smell(ing)?|see(ing)?|detect)\s+(smoke|burning smell)\b/i,
      /\bsmoke\s+(alarm|detector|going\s+off|is\s+(coming|everywhere|filling|pouring))\b/i,
      /\bthere'?s\s+(a\s+lot\s+of\s+)?smoke\b/i,
      /\bheavy\s+smoke\b/i,
      /\bsmoke\s+coming\s+from\b/i,
    ],
    script: 'If there is smoke, leave the building immediately and call 911. Do not re-enter until emergency services clear the building.',
  },
  {
    intentId: 'SAFE-005',
    intent: 'EMERGENCY_SPARKING',
    patterns: [
      /\b(see|seeing|active|visible)\s+sparks?\b/i,
      /\bsparks?\s+(flying|coming|everywhere)\b/i,
      /\b(wire|outlet|panel|unit|equipment)\s+(is\s+)?(spark(ing)?|arcing)\b/i,
      /\belectrical\s+arcing\b/i,
    ],
    script: 'Move away from the area immediately. Do not touch any electrical equipment, switches, or panels. Call 911 and your utility company from a safe location.',
  },
  {
    intentId: 'SAFE-006',
    intent: 'EMERGENCY_MEDICAL',
    patterns: [
      /\bchest\s+(pain|tightness|pressure)\b/i,
      /\b(can'?t|cannot|having\s+trouble|trouble)\s+breath(ing|e)?\b/i,
      /\bnot\s+breath(ing)?\b/i,
      /\bhaving\s+a?\s+heart\s+attack\b/i,
      /\bsuffering\s+a?\s+stroke\b/i,
      /\bseizure\b/i,
      /\bmedical\s+emergency\b/i,
      /\bunconscious\b/i,
      /\bpassed?\s+out\b/i,
      /\belectrocuted\b/i,
    ],
    script: 'This sounds like a medical emergency. Please call 911 immediately. If someone else is with you, have them call 911 now.',
  },
  {
    intentId: 'SAFE-007',
    intent: 'EMERGENCY_FLOODING',
    patterns: [
      /\b(severe|major|uncontrolled|rapidly)\s+flood(ing)?\b/i,
      /\bwater\b.{0,15}\b(everywhere|flooding|gushing|pouring|rising)\b/i,
      /\bwater\s+(and|near|touching|on)\s+(electric|outlet|panel|wiring|circuit)\b/i,
      /\belectric\b.{0,40}\bstanding\s+water\b/i,
      /\bstanding\s+water\b.{0,40}\belectric\b/i,
    ],
    script: 'For your safety, stay away from standing water especially near electrical equipment. If there is immediate danger, leave the area and call 911. Do not touch electrical equipment or enter flooded areas.',
  },
  {
    intentId: 'SAFE-008',
    intent: 'EMERGENCY_ELECTRICAL',
    patterns: [
      /\belectrical\s+fire\b/i,
      /\belectric\s+(shock|hazard)\b/i,
      /\b(being|got|getting|was)\s+shocked\b/i,
      /\bshock(ed)?\s+(by|from)\s+(a\s+)?(wire|outlet|panel|equipment|appliance)\b/i,
      /\b(wire|outlet|panel)\s+(is\s+)?(on\s+fire|burning|glowing)\b/i,
    ],
    script: 'Move away from the area immediately. Do not touch any electrical equipment. Call 911.',
  },
];

function detectSafetyIntent(text) {
  if (!text || typeof text !== 'string') return null;
  for (const rule of SAFE_RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(text)) {
        return { intentId: rule.intentId, intent: rule.intent, script: rule.script };
      }
    }
  }
  return null;
}

module.exports = { detectSafetyIntent, SAFE_RULES };
