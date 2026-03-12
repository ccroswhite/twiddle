import { useMemo } from 'react';
import { Node, Edge } from '@xyflow/react';
import { isActivityNode } from '@/utils/nodeConfig';

export type ValidationSeverity = 'error' | 'warning';
export type ValidationType = 'cycle' | 'unreachable' | 'missing_param' | 'invalid_dependency' | 'dangling_port';

export interface ValidationIssue {
    id: string;
    nodeId: string;
    severity: ValidationSeverity;
    type: ValidationType;
    message: string;
}

export function useWorkflowValidator(nodes: Node[], edges: Edge[]) {
    return useMemo(() => {
        const issues: ValidationIssue[] = [];
        const nodeMap = new Map<string, Node>(nodes.map(n => [n.id, n]));

        // 1. Build Effective Adjacency List (Visual Edges + Logical Dependencies)
        // Directed graph: dependency -> dependent (A -> B means B depends on A)
        const adjList = new Map<string, Set<string>>();
        nodes.forEach(n => adjList.set(n.id, new Set()));

        // Add Visual Edges
        edges.forEach(e => {
            // In Twiddle, edges visually denote flow: source finishes, target starts
            if (adjList.has(e.source)) {
                adjList.get(e.source)!.add(e.target);
            }
        });

        // Add Logical Dependencies (RequiredActivity)
        nodes.forEach(n => {
            const deps = (n.data.parameters as Record<string, any>)?.requiredActivity as string[] | undefined;
            if (deps && Array.isArray(deps)) {
                deps.forEach(dep => {
                    // Dependency format is usually "nodeId-Event" like "node_1-OK"
                    const upstreamNodeId = dep.split('-').slice(0, -1).join('-');
                    if (adjList.has(upstreamNodeId)) {
                        // upstreamNodeId -> n.id
                        adjList.get(upstreamNodeId)!.add(n.id);
                    }
                });
            }
        });

        // 2. Cycle Detection (DFS)
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
            const neighbors = adjList.get(nodeId) || new Set();
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

        // 3. Unreachable Activities
        // Compute in-degree for all nodes
        const inDegrees = new Map<string, number>();
        nodes.forEach(n => inDegrees.set(n.id, 0));

        adjList.forEach((targets) => {
            targets.forEach(target => {
                inDegrees.set(target, (inDegrees.get(target) || 0) + 1);
            });
        });

        nodes.forEach(n => {
            const isActivity = isActivityNode(n.data.nodeType as string);

            // If it's an activity and has no incoming edges/dependencies, it will never execute
            if (isActivity && inDegrees.get(n.id) === 0 && !nodeInCycle.has(n.id)) {
                issues.push({
                    id: `unreachable-${n.id}`,
                    nodeId: n.id,
                    severity: 'warning',
                    type: 'unreachable',
                    message: 'This activity has no incoming execution lines or wait conditions. It will run immediately on workflow start.'
                });
            }
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
                    const upstreamNodeId = dep.split('-').slice(0, -1).join('-');
                    // Only complain if the dependency is referencing a node that is NOT in the graph
                    // 'OK' or 'FAIL' etc.
                    // Note: cross-workflow signals might reference nodes from other workflows.
                    // In Twiddle, cross-workflow signals are just strings.
                    // However, conventional dependencies are formatted as 'node_xyz-EVENT'.
                    if (dep.match(/^node_.*-(OK|FAIL|SKIPPED)$/)) {
                        if (!nodeMap.has(upstreamNodeId)) {
                            issues.push({
                                id: `invalid-dep-${n.id}-${dep}`,
                                nodeId: n.id,
                                severity: 'error',
                                type: 'invalid_dependency',
                                message: `Wait Condition expects '${dep}', but node '${upstreamNodeId}' does not exist.`
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

        return issues;
    }, [nodes, edges]);
}
