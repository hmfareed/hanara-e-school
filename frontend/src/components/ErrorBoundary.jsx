import React from 'react';
import { RotateCcw, AlertTriangle } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary Caught Error]:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] w-full flex items-center justify-center p-6 bg-slate-50/50">
          <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-8 shadow-xl text-center space-y-5 animate-scale-in">
            <div className="h-14 w-14 bg-amber-50 border border-amber-200/80 rounded-2xl flex items-center justify-center text-amber-600 mx-auto shadow-xs">
              <AlertTriangle size={28} />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xl font-black text-slate-900 tracking-tight">
                Something went wrong in this view
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                {this.state.error?.message || 'An unexpected rendering error occurred. Don\'t worry, the rest of the application is safe.'}
              </p>
            </div>

            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs transition-all duration-200 cursor-pointer"
              >
                Try Again
              </button>
              <button
                onClick={this.handleReset}
                className="px-4 py-2.5 rounded-xl bg-[#4A1C20] hover:bg-[#361114] text-white font-bold text-xs shadow-md shadow-[#4A1C20]/20 flex items-center gap-2 transition-all duration-200 cursor-pointer"
              >
                <RotateCcw size={14} />
                <span>Reload Page</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
