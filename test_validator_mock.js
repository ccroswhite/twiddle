const { isActivityNode } = require('./packages/editor/src/utils/nodeConfig.ts');
// Read the useWorkflowValidator logic from file (mocking React)
const fs = require('fs');
const content = fs.readFileSync('./packages/editor/src/hooks/useWorkflowValidator.ts', 'utf-8');
console.log(content);
