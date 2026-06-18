"use client";

import React, { useState } from "react";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/google", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || "Failed to start Google authentication.");
        setLoading(false);
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen selection:bg-red-500/30 selection:text-[#ffb4a8] overflow-hidden flex flex-col justify-between">
      {/* Ambient Background Effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-[#ffb4a8]/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-[#568dff]/5 rounded-full blur-[150px]"></div>
      </div>

      {/* Main Content Canvas */}
      <main className="relative z-10 flex-grow flex flex-col lg:flex-row min-h-screen items-stretch">
        {/* Left Side: Branding & Hero */}
        <div className="flex-1 flex flex-col justify-center px-8 lg:px-16 py-12 lg:py-0 bg-[#1b0907]/30 animate-[fadeIn_0.6s_ease-out]">
          <div className="max-w-xl mx-auto lg:mx-0">
            {/* Logo */}
            <div className="flex items-center gap-4 mb-12">
              <img
                src="/logo.png"
                alt="YouTube Growth Intelligence Logo"
                width={120}
                height={120}
                className="w-16 h-16 rounded-xl object-contain shadow-lg shadow-red-500/10 border border-red-500/20"
              />
              <h1 className="font-semibold text-2xl text-[#ffdad4] tracking-tight">YouTube Growth Intelligence</h1>
            </div>

            {/* Tagline */}
            <h2 className="text-4xl lg:text-5xl font-bold text-[#ffdad4] mb-6 leading-tight">
              Grow Views. <br />
              <span className="text-[#ff5540]">Increase Revenue.</span> <br />
              Scale Channels.
            </h2>

            {/* Benefits List */}
            <div className="space-y-6 mb-12">
              <div className="flex items-start gap-4">
                <div className="mt-1 w-6 h-6 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20">
                  <span className="material-symbols-outlined text-[16px] text-[#ffb4a8]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                </div>
                <div>
                  <h3 className="font-semibold text-[#ffdad4] text-lg">Track all channels</h3>
                  <p className="text-sm text-[#ebbbb4]">Centralized dashboard for your entire content empire.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="mt-1 w-6 h-6 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20">
                  <span className="material-symbols-outlined text-[16px] text-[#ffb4a8]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                </div>
                <div>
                  <h3 className="font-semibold text-[#ffdad4] text-lg">Analyze revenue</h3>
                  <p className="text-sm text-[#ebbbb4]">Deep-dive into RPM, CPM, and sponsorship earnings.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="mt-1 w-6 h-6 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20">
                  <span className="material-symbols-outlined text-[16px] text-[#ffb4a8]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                </div>
                <div>
                  <h3 className="font-semibold text-[#ffdad4] text-lg">AI growth recommendations</h3>
                  <p className="text-sm text-[#ebbbb4]">Machine learning insights tailored to your niche.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="mt-1 w-6 h-6 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20">
                  <span className="material-symbols-outlined text-[16px] text-[#ffb4a8]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                </div>
                <div>
                  <h3 className="font-semibold text-[#ffdad4] text-lg">Multi-channel intelligence</h3>
                  <p className="text-sm text-[#ebbbb4]">Compare performance across different genres instantly.</p>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl text-sm animate-[shake_0.4s_ease-in-out]">
                {error}
              </div>
            )}

            {/* Action Button */}
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className={`w-full sm:w-auto px-10 py-5 bg-[#ff5540] text-white font-semibold rounded-xl hover:bg-[#ff5540]/90 active:scale-[0.98] transition-all flex items-center justify-center gap-4 shadow-xl shadow-red-500/10 cursor-pointer ${
                loading ? "opacity-75 cursor-wait" : ""
              }`}
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="currentColor"></path>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="currentColor"></path>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="currentColor"></path>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z" fill="currentColor"></path>
              </svg>
              {loading ? "Connecting to Google..." : "Sign in with Google"}
            </button>
            <p className="mt-6 text-xs text-[#ebbbb4]/60 tracking-widest uppercase">
              SECURE ENTERPRISE AUTHENTICATION
            </p>
          </div>
        </div>

        {/* Right Side: Visualization */}
        <div className="hidden lg:flex flex-1 relative items-center justify-center overflow-hidden bg-[#2b1613]/10 border-l border-white/5">
          {/* Animated Shader / Visual Background */}
          <div className="absolute inset-0 opacity-40 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-500/10 via-transparent to-transparent"></div>

          {/* Abstract Floating Cards UI */}
          <div className="relative z-20 w-full max-w-2xl px-12">
            <div className="relative animate-[fadeIn_1s_ease-out_0.2s_both]">
              {/* Main Data Card */}
              <div className="glass-card p-6 rounded-2xl glow-red border border-red-500/20 animate-float">
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <p className="text-xs text-[#ff5540] mb-1 font-semibold uppercase tracking-wider">Channel Performance</p>
                    <h4 className="text-xl font-bold text-[#ffdad4]">Intelligence Feed</h4>
                  </div>
                  <span className="material-symbols-outlined text-[#ff5540] text-3xl">trending_up</span>
                </div>
                <div className="space-y-4">
                  <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-[#ff5540] w-[75%] transition-all duration-1000 ease-out"></div>
                  </div>
                  <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-[#568dff] w-[45%] transition-all duration-1000 ease-out"></div>
                  </div>
                  <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 w-[90%] transition-all duration-1000 ease-out"></div>
                  </div>
                </div>
                <div className="mt-8 grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-[10px] text-[#ebbbb4] mb-1 uppercase">VIEWS</p>
                    <p className="text-lg font-bold text-[#ff5540] font-mono">+124%</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-[#ebbbb4] mb-1 uppercase">RPM</p>
                    <p className="text-lg font-bold text-[#ffdad4] font-mono">$4.20</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-[#ebbbb4] mb-1 uppercase">REVENUE</p>
                    <p className="text-lg font-bold text-emerald-400 font-mono">$12k</p>
                  </div>
                </div>
              </div>

              {/* Secondary Floating Badge */}
              <div className="absolute -top-12 -right-8 glass-card py-4 px-6 rounded-xl border border-blue-500/30 animate-float" style={{ animationDelay: "-2s" }}>
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-blue-400" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                  <div>
                    <p className="text-[10px] text-blue-400 font-semibold uppercase">AI INSIGHT</p>
                    <p className="text-sm text-[#ffdad4] font-semibold">Post at 6PM EST</p>
                  </div>
                </div>
              </div>

              {/* Tertiary Floating Badge */}
              <div className="absolute -bottom-8 -left-12 glass-card py-4 px-6 rounded-xl border border-white/5 animate-float" style={{ animationDelay: "-4s" }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-red-500/20 flex items-center justify-center border border-red-500/30">
                    <span className="material-symbols-outlined text-[#ffdad4] text-sm">person</span>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#ebbbb4]">CONNECTED</p>
                    <p className="text-sm text-[#ffdad4] font-semibold">Creator #1024</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Bottom decorative overlay */}
          <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-[#121212] to-transparent"></div>
        </div>
      </main>

      {/* Footer Information */}
      <footer className="fixed bottom-0 left-0 w-full px-8 py-4 z-20 hidden lg:block">
        <div className="flex justify-between items-center text-[10px] font-semibold text-[#ebbbb4]/40 tracking-wider uppercase">
          <div className="flex gap-6">
            <a className="hover:text-[#ffdad4] transition-colors" href="#">Privacy Policy</a>
            <a className="hover:text-[#ffdad4] transition-colors" href="#">Terms of Service</a>
            <a className="hover:text-[#ffdad4] transition-colors" href="#">API Status</a>
          </div>
          <p>© 2026 YouTube Growth Intelligence. All Rights Reserved.</p>
        </div>
      </footer>
    </div>
  );
}
