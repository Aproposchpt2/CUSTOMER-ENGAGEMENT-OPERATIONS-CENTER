'use strict';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function validSession(ctx){return Boolean(ctx&&ctx.synthetic===true&&ctx.voiceDemo===true&&ctx.selectedRoute==='sales-specialist'&&['tenantId','propertyId','contactId','actorId','sessionId'].every(key=>UUID.test(ctx[key]||'')));}
module.exports={validSession};
