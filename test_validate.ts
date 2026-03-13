import * as fs from 'fs';

// Mock validateWorkflow
export function validateWorkflow(nodes: any[], edges: any[], enforceExplicitDAG: boolean = true) {
    const issues: any[] = [];
    const nodeMap = new Map<string, any>(nodes.map(n => [n.id, n]));

    function isActivityNode(nodeType: string): boolean {
        const TRIGGER_NODE_TYPES = new Set(['twiddle.manualTrigger', 'twiddle.webhook', 'twiddle.interval']);
        return !TRIGGER_NODE_TYPES.has(nodeType);
    }

    const visualAdjList = new Map<string, Set<string>>();
    const logicalAdjList = new Map<string, Set<string>>();

    nodes.forEach(n => {
        visualAdjList.set(n.id, new Set());
        logicalAdjList.set(n.id, new Set());
    });

    edges.forEach(e => {
        if (visualAdjList.has(e.source)) {
            visualAdjList.get(e.source)!.add(e.target);
            logicalAdjList.get(e.source)!.add(e.target);
        }
    });

    nodes.forEach(n => {
        const deps = n.data?.parameters?.requiredActivity as string[] | undefined;
        if (deps && Array.isArray(deps)) {
            deps.forEach(dep => {
                const upstreamNodeId = dep.split('-').slice(0, -1).join('-');
                if (logicalAdjList.has(upstreamNodeId)) {
                    logicalAdjList.get(upstreamNodeId)!.add(n.id);
                }
            });
        }
    });

    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const nodeInCycle = new Set<string>();

    function detectCycle(nodeId: string): boolean {
        if (recursionStack.has(nodeId)) {
            nodeInCycle.add(nodeId);
            return true;
        }
        if (visited.has(nodeId)) return false;

        visited.add(nodeId);
        recursionStack.add(nodeId);

        const neighbors = logicalAdjList.get(nodeId) || new Set();
        for (const neighbor of neighbors) {
            if (detectCycle(neighbor)) {
                nodeInCycle.add(nodeId);
            }
        }

        recursionStack.delete(nodeId);
        return false;
    }

    nodes.forEach(n => {
        if (!visited.has(n.id)) { detectCycle(n.id); }
    });

    const visualInDegrees = new Map<string, number>();
    nodes.forEach(n => visualInDegrees.set(n.id, 0));

    visualAdjList.forEach((targets) => {
        targets.forEach(target => {
            visualInDegrees.set(target, (visualInDegrees.get(target) || 0) + 1);
        });
    });

    nodes.forEach(n => {
        const isActivity = isActivityNode(n.data.nodeType as string);

        if (isActivity && visualInDegrees.get(n.id) === 0 && !nodeInCycle.has(n.id)) {
            issues.push({
                id: `unreachable-${n.id}`,
                nodeId: n.id,
                severity: enforceExplicitDAG ? 'error' : 'warning',
                type: 'unreachable',
            });
        }
    });

    return issues.filter(issue => {
        if (issue.severity === 'error') return true;
        const node = nodeMap.get(issue.nodeId);
        if (!node) return true;
        const ignored = node.data?.parameters?.ignoredValidations as string[] || [];
        return !ignored.includes(issue.id);
    });
}

const n1 = { id: 'node_1766550787856', data: { label: 'HTTP Request', nodeType: 'twiddle.httpRequest' } };
const n2 = { id: 'node_1766550790368', data: { label: 'HTML Extract', nodeType: 'twiddle.htmlExtract' } };
const n3 = { id: 'node_1766550794097', data: { label: 'If', nodeType: 'twiddle.if' } };
const n4 = { id: 'node_1766551686048', data: { label: 'Code', nodeType: 'twiddle.code' } };
const n5 = { id: 'node_1766593394256', data: { label: 'If', nodeType: 'twiddle.if' } };

const sampleNodes = [n1, n2, n3, n4, n5];

console.log('Result length:', validateWorkflow(sampleNodes, [], true).length);
console.log('Result issues:', validateWorkflow(sampleNodes, [], true));
