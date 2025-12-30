/**
 * Python/Temporal Export Generator
 * 
 * Generates standalone Python Temporal applications from Twiddle workflows.
 * This module is organized into focused sub-modules for maintainability.
 * 
 * Directory structure:
 * - types.ts: Type definitions
 * - utils.ts: Utility functions
 * - activity-code/: Activity code generators by node type
 * - workflow-generator.ts: Workflow file generator
 * - activities-generator.ts: Activities file generator
 * - worker-generator.ts: Worker file generator
 * - starter-generator.ts: Starter/client file generator
 * - files-generator.ts: Auxiliary file generators
 */

// Re-export types
export type { WorkflowNode, WorkflowConnection, WorkflowData, GeneratedPythonCode } from './types.js';
export { TRIGGER_NODE_TYPES, isActivityNode } from './types.js';

// Re-export utilities
export { toPythonIdentifier, nodeTypeToFunctionName, toPythonValue } from './utils.js';

// Re-export activity code generator
export { generateActivityCode } from './activity-code/index.js';

// Re-export file generators
export { generateActivityExecution, generateWorkflowFile } from './workflow-generator.js';
export { generateActivitiesFile } from './activities-generator.js';
export { generateWorkerFile } from './worker-generator.js';
export { generateStarterFile } from './starter-generator.js';
export {
    generateRequirements,
    generateReadme,
    generateEnvExample,
    generateDockerfile,
    generateDockerCompose,
    generateRunScript,
    generateDockerignore,
} from './files-generator.js';

// Main export functions
import type { WorkflowData, GeneratedPythonCode } from './types.js';
import { generateWorkflowFile } from './workflow-generator.js';
import { generateActivitiesFile } from './activities-generator.js';
import { generateWorkerFile } from './worker-generator.js';
import { generateStarterFile } from './starter-generator.js';
import {
    generateRequirements,
    generateReadme,
    generateEnvExample,
    generateDockerfile,
    generateDockerCompose,
    generateRunScript,
    generateDockerignore,
} from './files-generator.js';

/**
 * Generate Python code for database storage.
 */
export function generatePythonCode(workflow: WorkflowData): GeneratedPythonCode {
    return {
        pythonWorkflow: generateWorkflowFile(workflow),
        pythonActivities: generateActivitiesFile(workflow),
        pythonRequirements: generateRequirements(workflow),
    };
}

/**
 * Main export function - generates all files for download.
 */
export function generatePythonExport(workflow: WorkflowData): Record<string, string> {
    return {
        'workflow.py': generateWorkflowFile(workflow),
        'activities.py': generateActivitiesFile(workflow),
        'worker.py': generateWorkerFile(workflow),
        'starter.py': generateStarterFile(workflow),
        'requirements.txt': generateRequirements(workflow),
        'Dockerfile': generateDockerfile(workflow),
        'docker-compose.yml': generateDockerCompose(workflow),
        'run.sh': generateRunScript(workflow),
        '.dockerignore': generateDockerignore(),
        '.env.example': generateEnvExample(workflow),
        'README.md': generateReadme(workflow),
    };
}
