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
