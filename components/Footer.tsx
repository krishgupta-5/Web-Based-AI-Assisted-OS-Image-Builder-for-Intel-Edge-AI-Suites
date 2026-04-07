"use client";

export default function Footer() {
  return (
    <footer className="relative mt-32 border-t border-white/10">
      
      {/* Background Glow */}
      <div className="absolute inset-0 pointer-events-none" />
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-purple-600/20 blur-[120px] opacity-40" />

      <div className="relative max-w-7xl mx-auto px-6 py-16">
        
        {/* Top Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500" />
              <span className="text-lg font-semibold text-white">EdgeOS</span>
            </div>

            <p className="text-sm text-white/60 leading-relaxed">
              Generate production-ready AI architectures from a single prompt.
              From models to deployment, everything structured and optimized.
            </p>
          </div>

          {/* Product */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Product</h3>
            <ul className="space-y-3 text-sm text-white/60">
              <li className="hover:text-white transition cursor-pointer">Features</li>
              <li className="hover:text-white transition cursor-pointer">Templates</li>
              <li className="hover:text-white transition cursor-pointer">Pricing</li>
              <li className="hover:text-white transition cursor-pointer">Roadmap</li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Resources</h3>
            <ul className="space-y-3 text-sm text-white/60">
              <li className="hover:text-white transition cursor-pointer">Docs</li>
              <li className="hover:text-white transition cursor-pointer">API Reference</li>
              <li className="hover:text-white transition cursor-pointer">Guides</li>
              <li className="hover:text-white transition cursor-pointer">Blog</li>
            </ul>
          </div>

          {/* Newsletter / CTA */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Stay updated</h3>
            
            <div className="flex items-center bg-white/5 border border-white/10 rounded-xl overflow-hidden">
              <input
                type="email"
                placeholder="Enter your email"
                className="bg-transparent px-4 py-3 text-sm text-white outline-none w-full placeholder:text-white/40"
              />
              <button className="px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-sm font-medium">
                Join
              </button>
            </div>

            <p className="text-xs text-white/40 mt-3">
              No spam. Only product updates.
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="mt-12 border-t border-white/10 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          
          <p className="text-xs text-white/40">
            © {new Date().getFullYear()} EdgeOS. All rights reserved.
          </p>

          <div className="flex items-center gap-6 text-xs text-white/50">
            <span className="hover:text-white cursor-pointer">Privacy</span>
            <span className="hover:text-white cursor-pointer">Terms</span>
            <span className="hover:text-white cursor-pointer">Contact</span>
          </div>
        </div>
      </div>
    </footer>
  );
}