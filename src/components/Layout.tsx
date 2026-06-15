import { ReactNode } from 'react';
import { Shield } from 'lucide-react';
import { Link } from 'react-router-dom';

interface LayoutProps {
  children: ReactNode;
  showNav?: boolean;
}

export default function Layout({ children, showNav = true }: LayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {showNav && (
        <header className="bg-white border-b border-slate-200">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center group-hover:bg-slate-700 transition-colors">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-slate-900 text-sm tracking-tight">
                BioAuth
              </span>
            </Link>
            <nav className="flex items-center gap-4">
              <Link
                to="/signin"
                className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                className="text-sm bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors"
              >
                Sign Up
              </Link>
            </nav>
          </div>
        </header>
      )}
      <main className="flex-1">{children}</main>
      <footer className="bg-white border-t border-slate-200 py-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-slate-500">
            Biometric Authentication System — Higher Institute of Sciences
          </p>
          <div className="flex items-center gap-4">
            <Link to="/admin" className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
              Admin
            </Link>
            <p className="text-xs text-slate-400">
              Zakarya Oukil
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
