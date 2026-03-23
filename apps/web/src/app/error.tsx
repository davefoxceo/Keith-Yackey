"use client";

export default function Error() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-navy">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-2">Something went wrong</h1>
        <p className="text-slate-400 mb-6">Please try again</p>
        <a
          href="/"
          className="inline-block px-6 py-3 bg-amber-500 text-slate-900 font-semibold rounded-xl hover:bg-amber-400 transition-colors"
        >
          Go Home
        </a>
      </div>
    </div>
  );
}
