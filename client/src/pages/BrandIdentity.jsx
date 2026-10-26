import React from 'react';
import Navbar from '../components/layout/Navbar';
import Logo from '../components/Logo';
import { Copy, ShieldCheck, ArrowRight, Download, Info } from 'lucide-react';
import { useToast } from '../components/ui/Toast';

export default function BrandIdentity() {
  const { toast } = useToast();

  const handleCopy = (txt) => {
    navigator.clipboard.writeText(txt);
    toast.success(`Copied: ${txt}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F3F0EA] font-sans">
      <Navbar />

      <main className="flex-1 max-w-5xl mx-auto w-full p-6 sm:p-8 space-y-8 pt-24 text-left">
        
        {/* Header summary */}
        <div>
          <h1 className="text-2xl font-serif font-bold tracking-tight text-[#1C1B18]">Brand Identity &amp; Visual System</h1>
          <p className="text-xs text-[#666157] mt-1 font-medium">Warm editorial design tokens, spacing structures, and component guidelines for DonateBridge.</p>
        </div>

        {/* Logo variants container */}
        <section className="bg-[#EAE4DC] border border-[#DCD4C8] rounded-3xl p-6 shadow-xs space-y-6">
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[#666157]">Logo Family System</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Navbar Logo */}
            <div className="p-5 border border-[#DCD4C8] rounded-2xl flex flex-col items-center justify-between min-h-[160px] bg-[#F3F0EA]">
              <Logo type="navbar" />
              <div className="text-center mt-4">
                <span className="text-[10px] font-mono text-[#666157] block font-bold">NAVBAR LOGO</span>
                <button
                  onClick={() => handleCopy('<Logo type="navbar" />')}
                  className="text-xs font-mono text-[#C48B3F] font-bold hover:underline mt-1 block cursor-pointer"
                >
                  Copy Component
                </button>
              </div>
            </div>

            {/* Icon Only Logo */}
            <div className="p-5 border border-[#DCD4C8] rounded-2xl flex flex-col items-center justify-between min-h-[160px] bg-[#F3F0EA]">
              <Logo type="icon" size="lg" />
              <div className="text-center mt-4">
                <span className="text-[10px] font-mono text-[#666157] block font-bold">ICON ONLY</span>
                <button
                  onClick={() => handleCopy('<Logo type="icon" size="lg" />')}
                  className="text-xs font-mono text-[#C48B3F] font-bold hover:underline mt-1 block cursor-pointer"
                >
                  Copy Component
                </button>
              </div>
            </div>

            {/* Horizontal Logo */}
            <div className="p-5 border border-[#DCD4C8] rounded-2xl flex flex-col items-center justify-between min-h-[160px] bg-[#F3F0EA]">
              <Logo type="horizontal" size="md" />
              <div className="text-center mt-4">
                <span className="text-[10px] font-mono text-[#666157] block font-bold">HORIZONTAL LOGO</span>
                <button
                  onClick={() => handleCopy('<Logo type="horizontal" size="md" />')}
                  className="text-xs font-mono text-[#C48B3F] font-bold hover:underline mt-1 block cursor-pointer"
                >
                  Copy Component
                </button>
              </div>
            </div>

            {/* Vertical Logo */}
            <div className="p-5 border border-[#DCD4C8] rounded-2xl flex flex-col items-center justify-between min-h-[160px] bg-[#F3F0EA]">
              <Logo type="vertical" size="sm" />
              <div className="text-center mt-4">
                <span className="text-[10px] font-mono text-[#666157] block font-bold">VERTICAL LOGO</span>
                <button
                  onClick={() => handleCopy('<Logo type="vertical" size="sm" />')}
                  className="text-xs font-mono text-[#C48B3F] font-bold hover:underline mt-1 block cursor-pointer"
                >
                  Copy Component
                </button>
              </div>
            </div>

          </div>
        </section>

        {/* Color Palette Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <div className="bg-[#EAE4DC] border border-[#DCD4C8] rounded-3xl p-6 shadow-xs space-y-4">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[#666157]">Brand Color Tokens</h2>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3.5 border border-[#DCD4C8] rounded-2xl bg-[#F3F0EA]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#1C1B18] shadow-xs border border-[#DCD4C8]" />
                  <div>
                    <p className="text-xs font-serif font-bold text-[#1C1B18]">Dark Obsidian</p>
                    <p className="text-[10px] text-[#666157] font-mono">#1C1B18</p>
                  </div>
                </div>
                <button onClick={() => handleCopy('#1C1B18')} className="p-2 hover:bg-[#EAE4DC] rounded-xl cursor-pointer">
                  <Copy className="w-4 h-4 text-[#666157]" />
                </button>
              </div>

              <div className="flex items-center justify-between p-3.5 border border-[#DCD4C8] rounded-2xl bg-[#F3F0EA]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#C48B3F] shadow-xs border border-[#DCD4C8]" />
                  <div>
                    <p className="text-xs font-serif font-bold text-[#1C1B18]">Warm Ocher Accent</p>
                    <p className="text-[10px] text-[#666157] font-mono">#C48B3F</p>
                  </div>
                </div>
                <button onClick={() => handleCopy('#C48B3F')} className="p-2 hover:bg-[#EAE4DC] rounded-xl cursor-pointer">
                  <Copy className="w-4 h-4 text-[#666157]" />
                </button>
              </div>

              <div className="flex items-center justify-between p-3.5 border border-[#DCD4C8] rounded-2xl bg-[#F3F0EA]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#F3F0EA] shadow-xs border border-[#DCD4C8]" />
                  <div>
                    <p className="text-xs font-serif font-bold text-[#1C1B18]">Warm Cream Base</p>
                    <p className="text-[10px] text-[#666157] font-mono">#F3F0EA</p>
                  </div>
                </div>
                <button onClick={() => handleCopy('#F3F0EA')} className="p-2 hover:bg-[#EAE4DC] rounded-xl cursor-pointer">
                  <Copy className="w-4 h-4 text-[#666157]" />
                </button>
              </div>
            </div>
          </div>

          <div className="bg-[#EAE4DC] border border-[#DCD4C8] rounded-3xl p-6 shadow-xs space-y-4">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[#666157]">Typography Stack Hierarchy</h2>
            
            <div className="space-y-4 text-xs">
              <div className="border-b border-[#DCD4C8] pb-3">
                <span className="text-[10px] font-mono text-[#666157] uppercase block">Font Family</span>
                <p className="text-xs font-serif font-bold text-[#1C1B18] mt-1">Instrument Serif, Inter, System UI</p>
              </div>
              <div className="border-b border-[#DCD4C8] pb-3">
                <span className="text-[10px] font-mono text-[#666157] uppercase block">Display Titles</span>
                <p className="text-xl font-serif font-bold text-[#1C1B18] mt-1">Editorial Heading Display</p>
              </div>
              <div>
                <span className="text-[10px] font-mono text-[#666157] uppercase block">Monospace/Labels</span>
                <p className="text-xs font-mono text-[#666157] font-bold uppercase mt-1">TRACKING_CODE_REF_9902</p>
              </div>
            </div>
          </div>

        </section>

        {/* Brand Spacing & Usage Guidelines */}
        <section className="bg-[#EAE4DC] border border-[#DCD4C8] rounded-3xl p-6 shadow-xs space-y-6">
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[#666157]">Brand Usage Rules &amp; Spacing Guidelines</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-[#666157] leading-relaxed">
            <div className="space-y-2">
              <h4 className="font-serif font-bold text-[#1C1B18]">Clear Space Minimum</h4>
              <p>Maintain a margin of at least 25% of the logo symbol's height around all four sides of the vector mark to ensure optimal visibility and layout balance.</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-serif font-bold text-[#1C1B18]">Visual Restrictions</h4>
              <p>Do not skew, stretch, or alter the color parameters of the icon elements. The interior heart/leaf components must remain aligned with the base coordinate bridge.</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-serif font-bold text-[#1C1B18]">System Spacing</h4>
              <p>Follow a strict 8px grid alignment (1/2rem, 1rem, 1.5rem spacing) for surrounding containers, keeping the user interfaces warm, pill-accented, and human-centric.</p>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}
