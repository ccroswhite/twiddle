import { Node, Edge } from '@xyflow/react';

export type ValidationSeverity = 'error' | 'warning';
export type ValidationType = 'cycle' | 'missing_param' | 'invalid_dependency' | 'dangling_port' | 'missing_edge';

export interface ValidationIssue {
    id: string;
    nodeId: string;
    severity: ValidationSeverity;
    type: ValidationType;
    message: string;
}

export function validateWorkflow(nodes: Node[], edges: Edge[], enforceExplicitDAG: boolean = true): ValidationIssue[] {
    if (!enforceExplicitDAG) {
        return [];
    }

    const issues: ValidationIssue[] = [];
    const nodeMap = new Map<string, Node>(nodes.map(n => [n.id, n]));

    // 1. Build Effective Adjacency Lists
    // Visual Graph: purely React Flow edges
    const visualAdjList = new Map<string, Set<string>>();
    // Logical Graph: visual edges + explicit requiredActivity arrays
    const logicalAdjList = new Map<string, Set<string>>();

    nodes.forEach(n => {
        visualAdjList.set(n.id, new Set());
        logicalAdjList.set(n.id, new Set());
    });

    // Add Visual Edges
    edges.forEach(e => {
        if (visualAdjList.has(e.source)) {
            visualAdjList.get(e.source)!.add(e.target);
            logicalAdjList.get(e.source)!.add(e.target);
        }
    });

    // Add Logical Dependencies (RequiredActivity)
    nodes.forEach(n => {
        const deps = (n.data.parameters as Record<string, any>)?.requiredActivity as string[] | undefined;
        if (deps && Array.isArray(deps)) {
            deps.forEach(dep => {
                const upstreamNodeId = dep.split('-').slice(0, -1).join('-');
                if (logicalAdjList.has(upstreamNodeId)) {
                    logicalAdjList.get(upstreamNodeId)!.add(n.id);
                }
            });
        }
    });

    // 2. Cycle Detection (DFS on Logical Graph)
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

        let hasCycle = false;
        const neighbors = logicalAdjList.get(nodeId) || new Set();
        for (const neighbor of neighbors) {
            if (detectCycle(neighbor)) {
                hasCycle = true;
                nodeInCycle.add(nodeId);
            }
        }

        recursionStack.delete(nodeId);
        return hasCycle;
    }

    nodes.forEach(n => {
        if (!visited.has(n.id)) {
            detectCycle(n.id);
        }
    });

    nodeInCycle.forEach(id => {
        issues.push({
            id: `cycle-${id}`,
            nodeId: id,
            severity: 'error',
            type: 'cycle',
            message: 'Node is part of an execution cycle (loop). Temporal DAGs must be acyclic.'
        });
    });

    // 3. (Deprecated) Unreachable Activities
    // In Control-M / Airflow / Temporal, nodes with 0 incoming dependencies 
    // are perfectly valid "Initial Jobs" that run immediately. 
    // We no longer flag 0-input nodes as "unreachable" errors.

    // Compute purely visual in-degrees for other logic if needed later
    const visualInDegrees = new Map<string, number>();
    nodes.forEach(n => visualInDegrees.set(n.id, 0));

    visualAdjList.forEach((targets) => {
        targets.forEach(target => {
            visualInDegrees.set(target, (visualInDegrees.get(target) || 0) + 1);
        });
    });

    // 4. Missing Parameters & Dangling Ports & Invalid Dependencies
    nodes.forEach(n => {
        const type = n.data.nodeType as string;
        const params = (n.data.parameters as Record<string, any>) || {};

        // A. Missing Parameters
        if (type === 'twiddle.script' && !params.code) {
            issues.push({
                id: `missing-param-code-${n.id}`,
                nodeId: n.id,
                severity: 'error',
                type: 'missing_param',
                message: 'Script node is missing Python code.'
            });
        }
        if ((type.includes('http') || type.includes('api')) && type.startsWith('credential.') && !params.url) {
            issues.push({
                id: `missing-param-url-${n.id}`,
                nodeId: n.id,
                severity: 'error',
                type: 'missing_param',
                message: 'HTTP node is missing a URL.'
            });
        }

        // B. Invalid Dependencies
        const deps = params.requiredActivity as string[] | undefined;
        if (deps && Array.isArray(deps)) {
            deps.forEach(dep => {
                const trimmedDep = dep.trim();

                // Robust Graph-Aware Parsing:
                // Instead of regex, we check if the dependency string starts with any known exact Node ID.
                // This handles any combination of hyphens, underscores, or UUIDs perfectly.
                let upstreamNodeId: string | null = null;
                let eventState: string | null = null;

                for (const knownId of nodeMap.keys()) {
                    if (trimmedDep.startsWith(`${knownId}-`)) {
                        upstreamNodeId = knownId;
                        eventState = trimmedDep.slice(knownId.length + 1); // everything after the hyphen
                        break;
                    }
                }

                if (upstreamNodeId && eventState) {
                    if (!nodeMap.has(upstreamNodeId)) {
                        issues.push({
                            id: `invalid-dep-${n.id}-${trimmedDep}`,
                            nodeId: n.id,
                            severity: 'error',
                            type: 'invalid_dependency',
                            message: `Wait Condition expects '${trimmedDep}', but node '${upstreamNodeId}' does not exist.`
                        });
                    }
                }
            });
        }

        // C. Dangling Ports
        const customRoutes = params.customRoutes as Array<{ condition: string; emitEvent: string }> | undefined;
        if (customRoutes && Array.isArray(customRoutes)) {
            const outputEdges = edges.filter(e => e.source === n.id);
            customRoutes.forEach(route => {
                if (!route.emitEvent) return; // ignore empty rows

                const hasEdge = outputEdges.some(e => e.sourceHandle === route.emitEvent);
                if (!hasEdge) {
                    issues.push({
                        id: `dangling-port-${n.id}-${route.emitEvent}`,
                        nodeId: n.id,
                        severity: 'warning',
                        type: 'dangling_port',
                        message: `Custom Route '${route.emitEvent}' has no connected edges. Execution will stall downstream if this is required.`
                    });
                }
            });
        }
    });

    return issues.filter(issue => {
        // Error severities cannot be ignored
        if (issue.severity === 'error') return true;

        const node = nodeMap.get(issue.nodeId);
        if (!node) return true;

        const ignored = (node.data.parameters as Record<string, any>)?.ignoredValidations as string[] || [];
        return !ignored.includes(issue.id);
    });
}
