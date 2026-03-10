import { useState, useEffect } from 'react';
import { credentialsApi } from '@/lib/api';
import { RefreshCw } from 'lucide-react';

interface CredentialDropdownProps {
    value: string;
    onChange: (value: string) => void;
    allowedTypes?: string[];
}

export function CredentialDropdown({ value, onChange, allowedTypes }: CredentialDropdownProps) {
    const [credentials, setCredentials] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchCredentials = async () => {
        setLoading(true);
        try {
            const data = await credentialsApi.list();
            let filtered = data as any[];
            if (allowedTypes && allowedTypes.length > 0) {
                filtered = filtered.filter(c => allowedTypes.includes(c.type));
            }
            setCredentials(filtered);
        } catch (err) {
            console.error('Failed to load credentials', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCredentials();
    }, []);

    return (
        <div className="flex items-center gap-2">
            <select
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                disabled={loading}
            >
                <option value="">Select a Connection Profile...</option>
                {credentials.map(c => (
                    <option key={c.id} value={c.id}>
                        {c.name} ({c.type})
                    </option>
                ))}
            </select>
            <button
                onClick={fetchCredentials}
                disabled={loading}
                className="p-2 text-slate-400 hover:text-primary-600 rounded bg-slate-50 border border-slate-200 transition-colors"
                title="Refresh Profiles"
            >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
        </div>
    );
}
