'use strict';
// Netlify ignore convention: zero cancels a build, one proceeds.
const branch = process.env.HEAD || process.env.BRANCH || '';
if (branch === 'feature/property-management-assistant-mvp') {
  console.log('PMA implementation branch: deployment disabled. Use a validated release branch.');
  process.exit(0);
}
process.exit(1);
