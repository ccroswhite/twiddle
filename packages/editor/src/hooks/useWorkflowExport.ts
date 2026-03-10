import { workflowsApi } from '@/lib/api';

export function useWorkflowExport(workflowId: string | undefined, isNew: boolean) {
    const handleExport = async (format: 'temporal' | 'airflow' | 'ir') => {
        if (isNew || !workflowId) {
            alert('Please save the workflow first');
            return;
        }
        try {
            switch (format) {
                case 'temporal':
                    await workflowsApi.exportPython(workflowId);
                    break;
                case 'airflow':
                    await workflowsApi.exportAirflow(workflowId);
                    break;
                case 'ir':
                    await workflowsApi.exportIR(workflowId);
                    break;
            }
        } catch (err) {
            alert((err as Error).message);
        }
    };

    return {
        handleExport,
    };
}
