import { logger } from '../logger.js';
import type { TestResult } from './types.js';
import type { DataSourceData } from './types.js';

export type TesterFunction = (data: DataSourceData) => Promise<TestResult>;

const registry = new Map<string, TesterFunction>();

export function registerTester(type: string, tester: TesterFunction) {
    registry.set(type, tester);
}

export function getTester(type: string): TesterFunction | undefined {
    return registry.get(type);
}

export async function testDataSource(
    type: string,
    data: DataSourceData,
): Promise<TestResult> {
    const tester = getTester(type);
    if (!tester) {
        logger.warn(`Unknown data source type for testing: ${type}`);
        return {
            success: false,
            message: `Unknown data source type: ${type}`,
        };
    }

    try {
        return await tester(data);
    } catch (error) {
        logger.error({ err: error }, `Error testing data source:`);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Unknown error occurred',
        };
    }
}
