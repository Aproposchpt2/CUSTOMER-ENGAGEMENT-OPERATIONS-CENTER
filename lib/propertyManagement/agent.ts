import {intentCatalog} from './intentCatalog';
import model from '../../twilio-bridge/pma-knowledge-v1.json';
import profile from '../../twilio-bridge/pma-profile.json';
/** Shared instructions and tool contract for existing voice/chat runtimes. */
export const propertyAgentInstructions=profile.instructions+'\n'+model.runtimeInstructions+'\nIntent catalog v'+intentCatalog.version+': '+intentCatalog.intents.map(i=>i.intent).join(', ')+'. The server applies deterministic safety review, confidence thresholds, entity checks and authorization. A classification never grants authority.';
export const propertyWorkflowTool=profile.tool;
