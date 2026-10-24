'use strict';
// Netlify ignore convention: zero cancels a build, one proceeds.
const branches = [process.env.HEAD,process.env.BRANCH].filter(Boolean);
if (branches.some(branch=>branch === 'feature/property-management-assistant-mvp' || branch.startsWith('repair/pma-005-'))) {
  console.log('PMA implementation branch: deployment disabled. Use a validated release branch.');
  process.exit(0);
}
process.exit(1);
