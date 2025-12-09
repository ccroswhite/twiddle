/**
 * Twiddle Temporal Worker
 */
import { Worker, NativeConnection } from '@temporalio/worker';
import * as activities from './activities/index.js';

const TASK_QUEUE = process.env.TEMPORAL_TASK_QUEUE || 'twiddle-workflows';
const TEMPORAL_ADDRESS = process.env.TEMPORAL_ADDRESS || 'localhost:7233';

async function run() {
  console.log('Starting Twiddle Temporal Worker...');
  console.log(`Temporal Address: ${TEMPORAL_ADDRESS}`);
  console.log(`Task Queue: ${TASK_QUEUE}`);

  // Connect to Temporal server
  const connection = await NativeConnection.connect({
    address: TEMPORAL_ADDRESS,
  });

  // Create worker
  const worker = await Worker.create({
    connection,
    namespace: 'default',
    taskQueue: TASK_QUEUE,
    workflowsPath: new URL('../workflows/dist/index.js', import.meta.url).pathname,
    activities,
  });

  console.log('Worker connected and ready to process workflows');

  // Start the worker
  await worker.run();
}

run().catch((err) => {
  console.error('Worker failed:', err);
  process.exit(1);
});
