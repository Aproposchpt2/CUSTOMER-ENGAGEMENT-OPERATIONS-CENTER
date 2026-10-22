import model from '../../twilio-bridge/pma-knowledge-v1.json';
import profile from '../../twilio-bridge/pma-profile.json';
/** Shared instructions and tool contract for existing voice/chat runtimes. */
export const propertyAgentInstructions=profile.instructions+'\n'+model.runtimeInstructions;
export const propertyWorkflowTool=profile.tool;
