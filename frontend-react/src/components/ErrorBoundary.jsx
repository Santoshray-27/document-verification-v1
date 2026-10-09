import React from 'react';
import { AlertOctagon, RotateCcw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-bg flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-surface border border-rose-500/30 p-8 shadow-hard text-center">
            <AlertOctagon size={48} className="mx-auto text-rose-600 mb-6" />
            <h1 className="font-display text-3xl text-ink mb-4">Fatal System Error</h1>
            <p className="font-mono text-[10px] text-ink-muted mb-6 leading-relaxed">
              An unrecoverable exception occurred in the UI thread. Context has been preserved in the console.
            </p>
            
            <div className="bg-bg border border-line p-4 text-left overflow-x-auto mb-8">
               <code className="font-mono text-[9px] text-rose-600 block whitespace-pre-wrap">
                 {this.state.error?.toString()}
               </code>
            </div>

            <button 
              onClick={() => {
                this.setState({ hasError: false });
                window.location.reload();
              }}
              className="px-6 py-3 bg-ink text-bg font-mono text-[10px] uppercase font-bold tracking-widest inline-flex items-center gap-2 hover:-translate-y-1 transition-transform shadow-hard"
            >
              <RotateCcw size={14} /> Restart Runtime
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
