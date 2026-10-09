import React, { useEffect, useState } from 'react';
import api, { errMsg } from '../../api/axios';

export default function ApiCheck() {
  const [status, setStatus] = useState('Checking...');
  const [details, setDetails] = useState(null);

  useEffect(() => {
    if (import.meta.env.PROD) {
      setStatus('Not available in production');
      return;
    }
    
    api.get('/health')
      .then(res => {
        setStatus('Connected successfully');
        setDetails(res.data);
      })
      .catch(err => {
        setStatus('Failed to connect to backend');
        setDetails({ error: errMsg(err), raw: err.message });
      });
  }, []);

  if (import.meta.env.PROD) {
    return <div className="p-10 font-mono text-red-500">Not available in production</div>;
  }

  return (
    <div className="p-10 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold font-display text-foreground">API Connection Check</h1>
      
      <div className={`p-4 rounded-md border ${status.includes('Connected') ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' : 'bg-red-500/10 border-red-500/20 text-red-600'}`}>
        <h2 className="font-semibold">{status}</h2>
      </div>

      {details && (
        <div className="bg-surface border border-line rounded-md p-4 overflow-x-auto">
          <pre className="text-xs text-muted-foreground">
            {JSON.stringify(details, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
