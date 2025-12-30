/**
 * Workflow export routes
 * Handles exporting workflows to Python/Temporal, Airflow, and IR formats
 */
import type { FastifyPluginAsync, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma.js';
import { generatePythonExport } from '../../lib/export/temporal-python/index.js';
import { generateAirflowExport } from '../../lib/airflow-export.js';
import { workflowToIR } from '../../lib/ir/index.js';
import { create as createTar } from 'tar';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Create a safe directory name from workflow metadata
 */
function createDirectoryName(name: string, environment: string, version: number, suffix = ''): string {
    const safeName = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'workflow';
    return suffix
        ? `${safeName}-${suffix}-${environment.toLowerCase()}-v${version}`
        : `${safeName}-${environment.toLowerCase()}-v${version}`;
}

/**
 * Create a tarball from files and send as response
 */
async function sendAsTarball(
    reply: FastifyReply,
    dirName: string,
    files: Record<string, string>,
    workflowDefinition: Record<string, unknown>
): Promise<void> {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'twiddle-export-'));
    const workflowDir = path.join(tempDir, dirName);

    try {
        // Create the workflow directory
        fs.mkdirSync(workflowDir, { recursive: true });

        // Write all files to the directory
        for (const [filename, content] of Object.entries(files)) {
            fs.writeFileSync(path.join(workflowDir, filename), content, 'utf-8');
        }

        // Write the workflow definition for re-import
        fs.writeFileSync(
            path.join(workflowDir, 'twiddle-workflow.json'),
            JSON.stringify(workflowDefinition, null, 2),
            'utf-8'
        );

        // Create the tarball
        const tarballPath = path.join(tempDir, `${dirName}.tar.gz`);
        await createTar(
            {
                gzip: true,
                file: tarballPath,
                cwd: tempDir,
            },
            [dirName]
        );

        // Read the tarball and send it
        const tarballBuffer = fs.readFileSync(tarballPath);

        // Clean up temp directory
        fs.rmSync(tempDir, { recursive: true, force: true });

        // Send the tarball
        reply
            .header('Content-Type', 'application/gzip')
            .header('Content-Disposition', `attachment; filename="${dirName}.tar.gz"`)
            .send(tarballBuffer);

    } catch (err) {
        // Clean up on error
        try {
            fs.rmSync(tempDir, { recursive: true, force: true });
        } catch {
            // Ignore cleanup errors
        }
        throw err;
    }
}

export const exportRoutes: FastifyPluginAsync = async (app) => {
    // Export workflow as Python Temporal application
    app.get<{
        Params: { id: string };
        Querystring: { format?: 'json' | 'tar' };
    }>('/:id/export/python', async (request, reply) => {
        const { id } = request.params;
        const { format = 'tar' } = request.query;

        const workflow = await prisma.workflow.findUnique({
            where: { id },
        });

        if (!workflow) {
            return reply.status(404).send({ error: 'Workflow not found' });
        }

        // Generate Python files
        const files = generatePythonExport({
            id: workflow.id,
            name: workflow.name,
            description: workflow.description || undefined,
            nodes: workflow.nodes as unknown[],
            connections: workflow.connections as unknown[],
        } as Parameters<typeof generatePythonExport>[0]);

        const dirName = createDirectoryName(workflow.name, workflow.environment, workflow.version);

        const definition = {
            workflowId: workflow.id,
            workflowName: workflow.name,
            workflowDescription: workflow.description,
            version: workflow.version,
            environment: workflow.environment,
            exportedAt: new Date().toISOString(),
            definition: {
                nodes: workflow.nodes,
                connections: workflow.connections,
                settings: workflow.settings,
                tags: workflow.tags,
            },
        };

        if (format === 'tar') {
            await sendAsTarball(reply, dirName, files, definition);
            return;
        }

        // Return as JSON
        return {
            ...definition,
            directoryName: dirName,
            files,
        };
    });

    // Export workflow as Airflow DAG
    app.get<{
        Params: { id: string };
        Querystring: { format?: 'json' | 'tar' };
    }>('/:id/export/airflow', async (request, reply) => {
        const { id } = request.params;
        const { format = 'tar' } = request.query;

        const workflow = await prisma.workflow.findUnique({
            where: { id },
        });

        if (!workflow) {
            return reply.status(404).send({ error: 'Workflow not found' });
        }

        // Generate Airflow files
        const files = generateAirflowExport({
            id: workflow.id,
            name: workflow.name,
            description: workflow.description || undefined,
            nodes: workflow.nodes as unknown[],
            connections: workflow.connections as unknown[],
        });

        const dirName = createDirectoryName(workflow.name, workflow.environment, workflow.version, 'airflow');

        const definition = {
            workflowId: workflow.id,
            workflowName: workflow.name,
            workflowDescription: workflow.description,
            version: workflow.version,
            environment: workflow.environment,
            exportedAt: new Date().toISOString(),
            exportFormat: 'airflow',
            definition: {
                nodes: workflow.nodes,
                connections: workflow.connections,
                settings: workflow.settings,
                tags: workflow.tags,
            },
        };

        if (format === 'tar') {
            await sendAsTarball(reply, dirName, files, definition);
            return;
        }

        // Return as JSON
        return {
            ...definition,
            directoryName: dirName,
            files,
        };
    });

    // Export workflow as Twiddle IR (JSON)
    app.get<{
        Params: { id: string };
    }>('/:id/export/ir', async (request, reply) => {
        const { id } = request.params;

        const workflow = await prisma.workflow.findUnique({
            where: { id },
        });

        if (!workflow) {
            return reply.status(404).send({ error: 'Workflow not found' });
        }

        // Convert to IR format
        const ir = workflowToIR({
            id: workflow.id,
            name: workflow.name,
            description: workflow.description,
            nodes: workflow.nodes,
            connections: workflow.connections,
            settings: workflow.settings,
            tags: workflow.tags as string[],
        });

        // Create filename
        const safeName = workflow.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '') || 'workflow';
        const filename = `${safeName}-v${workflow.version}.twiddle.json`;

        return reply
            .header('Content-Type', 'application/json')
            .header('Content-Disposition', `attachment; filename="${filename}"`)
            .send(ir);
    });
};
