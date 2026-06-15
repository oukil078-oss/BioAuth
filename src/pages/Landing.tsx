import { Link } from 'react-router-dom';
import { Shield, Fingerprint, ScanFace, Lock, ArrowRight } from 'lucide-react';
import Layout from '../components/Layout';

export default function Landing() {
  return (
    <Layout>
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-32">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-slate-100 border border-slate-200 rounded-full px-4 py-1.5 mb-8">
            <Shield className="w-3.5 h-3.5 text-slate-600" />
            <span className="text-xs font-medium text-slate-600 tracking-wide uppercase">
              Biometrics Module — Mini Project
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 tracking-tight leading-tight">
            Biometric
            <br />
            <span className="text-teal-600">Authentication</span> System
          </h1>

          <p className="mt-6 text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
            A secure multi-factor authentication platform combining traditional credentials
            with AI-powered facial recognition for identity verification.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/signup"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl font-medium hover:bg-slate-700 transition-all hover:shadow-lg"
            >
              Create Account
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/signin"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-slate-300 text-slate-700 px-6 py-3 rounded-xl font-medium hover:bg-slate-100 transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>

        <div className="mt-24 grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <FeatureCard
            icon={<Lock className="w-5 h-5" />}
            title="Secure Credentials"
            description="SHA-256 hashed passwords with unique salt per user. Strict validation rules enforced."
          />
          <FeatureCard
            icon={<ScanFace className="w-5 h-5" />}
            title="Face Recognition"
            description="128-dimensional face embeddings using deep neural networks for biometric verification."
          />
          <FeatureCard
            icon={<Fingerprint className="w-5 h-5" />}
            title="Triple-Factor Auth"
            description="Password, face recognition, and fingerprint verification required. No single point of compromise."
          />
        </div>
      </section>

      <section className="bg-white border-t border-slate-200 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-sm font-semibold text-slate-500 uppercase tracking-wider mb-8">
            Authentication Flow
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
            <FlowStep step="01" label="Register" sublabel="Username & Password" />
            <FlowStep step="02" label="Enroll Face" sublabel="Webcam Capture" />
            <FlowStep step="03" label="Sign In" sublabel="Credentials Check" />
            <FlowStep step="04" label="Verify Face" sublabel="Biometric Match" />
          </div>
        </div>
      </section>
    </Layout>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-md transition-shadow">
      <div className="w-10 h-10 bg-teal-50 border border-teal-100 rounded-xl flex items-center justify-center text-teal-600 mb-4">
        {icon}
      </div>
      <h3 className="font-semibold text-slate-900 mb-2">{title}</h3>
      <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
    </div>
  );
}

function FlowStep({ step, label, sublabel }: { step: string; label: string; sublabel: string }) {
  return (
    <div className="text-center">
      <div className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-3">
        <span className="text-white text-xs font-bold">{step}</span>
      </div>
      <p className="font-medium text-slate-900 text-sm">{label}</p>
      <p className="text-xs text-slate-500 mt-1">{sublabel}</p>
    </div>
  );
}
