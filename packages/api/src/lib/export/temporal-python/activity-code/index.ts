/**
 * Activity Code Generators
 * 
 * Each file exports a function that returns the Python activity code
 * for a specific node type.
 */

import { httpRequestActivity } from './http-request.js';
import { codeActivity } from './code.js';
import { ifActivity } from './if.js';
import { setDataActivity } from './set-data.js';
import { sshActivity } from './ssh.js';
import { databaseActivities } from './database.js';
import { defaultActivity } from './default.js';

// Registry of activity code generators
const activityGenerators: Record<string, () => string> = {
    'twiddle.httpRequest': httpRequestActivity,
    'twiddle.code': codeActivity,
    'twiddle.if': ifActivity,
    'twiddle.setData': setDataActivity,
    'twiddle.ssh': sshActivity,
    'twiddle.mssql': () => databaseActivities.mssql(),
    'twiddle.postgresql': () => databaseActivities.postgresql(),
    'twiddle.mysql': () => databaseActivities.mysql(),
};

/**
 * Generate Python activity code for a node type
 */
export function generateActivityCode(nodeType: string): string {
    const generator = activityGenerators[nodeType];
    if (generator) {
        return generator();
    }
    return defaultActivity(nodeType);
}
