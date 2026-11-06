// Keypad language menu that runs in Twilio before a call reaches its ElevenLabs agent.
// A caller who presses nothing, or anything other than 2, goes to the agent in English:
// no path through this menu may leave a caller stranded.

export const ELEVENLABS_INBOUND_URL = 'https://api.us.elevenlabs.io/twilio/inbound_call';
const CHOICE_PATH = '/api/twilio/language-choice';
const XML_HEADER = '<?xml version="1.0" encoding="UTF-8"?>';

export type VoiceLanguage = 'en' | 'es';

export function languageForDigit(digits: unknown): VoiceLanguage {
  return digits === '2' ? 'es' : 'en';
}

export function isCallSid(value: unknown): value is string {
  return typeof value === 'string' && /^CA[0-9a-fA-F]{32}$/.test(value);
}

export function connectToAgentTwiml(): string {
  return `${XML_HEADER}<Response><Redirect method="POST">${ELEVENLABS_INBOUND_URL}</Redirect></Response>`;
}

export function menuTwiml(): string {
  return `${XML_HEADER}<Response>`
    + `<Gather input="dtmf" numDigits="1" timeout="4" method="POST" action="${CHOICE_PATH}" actionOnEmptyResult="false">`
    + '<Say voice="Polly.Joanna" language="en-US">For English, press 1.</Say>'
    + '<Say voice="Polly.Lupe" language="es-US">Para español, oprima 2.</Say>'
    + '</Gather>'
    + `<Redirect method="POST">${ELEVENLABS_INBOUND_URL}</Redirect>`
    + '</Response>';
}

// ElevenLabs asks for this as the call starts. English is the agent default, so only Spanish
// needs an override; the agent's Spanish preset then supplies the greeting.
export function initiationResponse(language: VoiceLanguage, callerId: unknown) {
  const digits = typeof callerId === 'string' ? callerId.replace(/\D/g, '').slice(-10) : '';
  const callerNumber = digits.length === 10
    ? `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
    : '';
  return {
    type: 'conversation_initiation_client_data',
    dynamic_variables: {
      known_caller_name: '',
      greeting_question: '',
      caller_number: callerNumber,
    },
    ...(language === 'es' ? { conversation_config_override: { agent: { language: 'es' } } } : {}),
  };
}

// Stellar auto-attendant for the one main number. Language first, then department. The demo
// agent answers on this number itself; Sales and Support are reached by dialing their own lines.
// Each of those lines opens with the language menu above, so the dial sends the caller's choice
// as a keypress and the caller is not asked twice.
const ATTENDANT_PATH = '/api/twilio/attendant';
export const SALES_LINE = '+17253305102';
export const SUPPORT_LINE = '+17029351414';
export const PMA_LINE = '+17252010584';

function attendantPrompt(language: VoiceLanguage): string {
  return language === 'es'
    ? '<Say voice="Polly.Lupe" language="es-US">Gracias por llamar a Stellar Intelligent Software Developers. Para ventas, oprima 1. Para la Asistente de Administración de Propiedades, oprima 2. Para soporte, oprima 3. Para el Centro de Atención al Cliente, oprima 4.</Say>'
    : '<Say voice="Polly.Joanna" language="en-US">Thank you for calling Stellar Intelligent Software Developers. For Sales, press 1. For the Property Management Assistant, press 2. For Support, press 3. For the Customer Care Center, press 4.</Say>';
}

export function attendantLanguageTwiml(): string {
  return `${XML_HEADER}<Response>`
    + `<Gather input="dtmf" numDigits="1" timeout="4" method="POST" action="${ATTENDANT_PATH}?step=language" actionOnEmptyResult="true">`
    + '<Say voice="Polly.Joanna" language="en-US">For English, press 1.</Say>'
    + '<Say voice="Polly.Lupe" language="es-US">Para español, oprima 2.</Say>'
    + '</Gather>'
    + `<Redirect method="POST">${ATTENDANT_PATH}?step=language</Redirect>`
    + '</Response>';
}

export function attendantDepartmentTwiml(language: VoiceLanguage, attempt: number): string {
  const route = `${ATTENDANT_PATH}?step=route&amp;lang=${language}&amp;attempt=${attempt}`;
  return `${XML_HEADER}<Response>`
    + `<Gather input="dtmf" numDigits="1" timeout="6" method="POST" action="${route}" actionOnEmptyResult="true">`
    + attendantPrompt(language)
    + '</Gather>'
    + `<Redirect method="POST">${route}</Redirect>`
    + '</Response>';
}

function dialLine(line: string, language: VoiceLanguage): string {
  const languageDigit = language === 'es' ? '2' : '1';
  return `${XML_HEADER}<Response>`
    + `<Dial action="${ATTENDANT_PATH}?step=ended&amp;lang=${language}" method="POST"><Number sendDigits="w${languageDigit}">${line}</Number></Dial>`
    + '</Response>';
}

export type AttendantRoute = { twiml: string; demoLanguage?: VoiceLanguage };

// One repeat for a missed or wrong key, then Sales, so no caller is left in the menu.
export function attendantRoute(digits: unknown, language: VoiceLanguage, attempt: number): AttendantRoute {
  if (digits === '4') return { twiml: connectToAgentTwiml(), demoLanguage: language };
  if (digits === '3') return { twiml: dialLine(SUPPORT_LINE, language) };
  if (digits === '2') return { twiml: dialLine(PMA_LINE, language) };
  if (digits === '1' || attempt >= 2) return { twiml: dialLine(SALES_LINE, language) };
  return { twiml: attendantDepartmentTwiml(language, attempt + 1) };
}

export function attendantEndedTwiml(dialStatus: unknown, language: VoiceLanguage): string {
  if (dialStatus === 'completed' || dialStatus === 'answered') return `${XML_HEADER}<Response><Hangup/></Response>`;
  const apology = language === 'es'
    ? '<Say voice="Polly.Lupe" language="es-US">No pudimos completar su llamada. Por favor, intente de nuevo más tarde.</Say>'
    : '<Say voice="Polly.Joanna" language="en-US">We could not connect your call. Please try again later.</Say>';
  return `${XML_HEADER}<Response>${apology}<Hangup/></Response>`;
}
