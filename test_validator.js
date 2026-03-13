const nodes = [
  { id: '1', data: { nodeType: 'twiddle.if', parameters: {} } },
  { id: '2', data: { nodeType: 'twiddle.httpRequest', parameters: {} } },
];
const edges = [];

const issues = [];
const nodeMap = new Map(nodes.map(n => [n.id, n]));
const adjList = new Map();
nodes.forEach(n => adjList.set(n.id, new Set()));

edges.forEach(e => {
  if (adjList.has(e.source)) {
    adjList.get(e.source).add(e.target);
  }
});

const inDegrees = new Map();
nodes.forEach(n => inDegrees.set(n.id, 0));

adjList.forEach((targets) => {
  targets.forEach(target => {
    inDegrees.set(target, (inDegrees.get(target) || 0) + 1);
  });
});

nodes.forEach(n => {
  const isActivity = !['twiddle.manualTrigger', 'twiddle.webhook', 'twiddle.interval'].includes(n.data.nodeType);
  if (isActivity && inDegrees.get(n.id) === 0) {
    issues.push({
      id: `unreachable-${n.id}`,
      nodeId: n.id,
      severity: 'warning',
      type: 'unreachable',
      message: 'This activity has no incoming execution lines or wait conditions. It will run immediately on workflow start.'
    });
  }
});

console.log(issues.length);
