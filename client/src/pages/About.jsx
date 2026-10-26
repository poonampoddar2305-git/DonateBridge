import React, { useState } from 'react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import { ShieldCheck, Heart, Users, Target, HelpCircle, Code, ChevronDown, ChevronUp, Sparkles, Sprout } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useNavigate } from 'react-router-dom';

export default function About() {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState(null);

  const faqs = [
    {
      q: 'How does DonateBridge ensure items reach the right people?',
      a: 'We verify all participating NGOs through government registration checks and perform location audits. Every donation handover requires direct GPS custody signatures, providing full transparency and accountability.'
    },
    {
      q: 'Are there any platform fees or hidden charges?',
      a: 'No. DonateBridge is a completely non-monetary system built to support the circular economy and local communities. There are no fees for donors or NGOs.'
    },
    {
      q: 'How does the Smart Match system pair donors with NGOs?',
      a: 'Our algorithm analyzes distance, real-time demand urgency, item suitability, and NGO response rates to suggest the most optimal and impactful matches instantly.'
    },
    {
      q: 'What kind of items can I donate?',
      a: 'You can donate physical assets including textbooks, clothing, winter blankets, food staples, sports kits, learning electronics, and medical equipment.'
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#F3F0EA] font-sans">
      <Navbar />

      <main className="flex-grow max-w-5xl mx-auto w-full px-6 py-12 space-y-16 pt-24 text-left">

        {/* Mission & Vision Hero */}
        <section className="text-center space-y-6 max-w-3xl mx-auto">
          <span className="px-4 py-1.5 bg-[#EAE4DC] text-[#C48B3F] rounded-full font-mono text-xs font-bold uppercase tracking-wider border border-[#DCD4C8]">
            About Our Initiative
          </span>
          <h1 className="font-serif font-bold text-3xl sm:text-4xl text-[#1C1B18] tracking-tight leading-tight">
            Connecting surplus items with real community needs
          </h1>
          <p className="text-[#666157] text-sm leading-relaxed max-w-xl mx-auto">
            DonateBridge is a transparent, non-monetary network matching verified surplus resources to local non-profits.
          </p>
        </section>

        {/* Mission Card Grid */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#EAE4DC] border border-[#DCD4C8] rounded-3xl p-6 shadow-xs space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#F3F0EA] flex items-center justify-center text-[#C48B3F] border border-[#DCD4C8]">
              <Target className="w-6 h-6" />
            </div>
            <h3 className="font-serif font-bold text-[#1C1B18] text-base">Our Mission</h3>
            <p className="text-[#666157] text-xs leading-relaxed">
              Redirect valid physical items from landfills directly to those who need them most, promoting circularity.
            </p>
          </div>

          <div className="bg-[#EAE4DC] border border-[#DCD4C8] rounded-3xl p-6 shadow-xs space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#F3F0EA] flex items-center justify-center text-[#C48B3F] border border-[#DCD4C8]">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="font-serif font-bold text-[#1C1B18] text-base">Trust &amp; Safety</h3>
            <p className="text-[#666157] text-xs leading-relaxed">
              Strict administrative onboarding audits and GPS-verified custody signatures ensure donations reach their exact destination.
            </p>
          </div>

          <div className="bg-[#EAE4DC] border border-[#DCD4C8] rounded-3xl p-6 shadow-xs space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#F3F0EA] flex items-center justify-center text-[#C48B3F] border border-[#DCD4C8]">
              <Sprout className="w-6 h-6" />
            </div>
            <h3 className="font-serif font-bold text-[#1C1B18] text-base">Eco Impact</h3>
            <p className="text-[#666157] text-xs leading-relaxed">
              Every local match calculation tracks and aggregates CO₂ emission offsets, proving the carbon savings of local donation pathways.
            </p>
          </div>
        </section>

        {/* Technology architecture */}
        <section className="bg-[#EAE4DC] border border-[#DCD4C8] rounded-3xl p-8 shadow-xs space-y-6">
          <div className="flex items-center gap-3">
            <Code className="w-6 h-6 text-[#C48B3F]" />
            <h3 className="font-serif font-bold text-[#1C1B18] text-lg">Our Technology Stack</h3>
          </div>
          <p className="text-[#666157] text-xs leading-relaxed">
            Built using modern, robust frontend technologies to guarantee smooth interaction, geographic accuracy, and responsive animations.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="p-5 border border-[#DCD4C8] rounded-2xl bg-[#F3F0EA] space-y-1">
              <p className="font-serif font-bold text-[#1C1B18] text-xs">React 19 &amp; Vite</p>
              <p className="text-[#666157] text-[10px] font-mono">Fast UI Rendering</p>
            </div>
            <div className="p-5 border border-[#DCD4C8] rounded-2xl bg-[#F3F0EA] space-y-1">
              <p className="font-serif font-bold text-[#1C1B18] text-xs">Leaflet Maps</p>
              <p className="text-[#666157] text-[10px] font-mono">Geo-Location Verification</p>
            </div>
            <div className="p-5 border border-[#DCD4C8] rounded-2xl bg-[#F3F0EA] space-y-1">
              <p className="font-serif font-bold text-[#1C1B18] text-xs">Tailwind CSS</p>
              <p className="text-[#666157] text-[10px] font-mono">Editorial Styling</p>
            </div>
            <div className="p-5 border border-[#DCD4C8] rounded-2xl bg-[#F3F0EA] space-y-1">
              <p className="font-serif font-bold text-[#1C1B18] text-xs">Framer Motion</p>
              <p className="text-[#666157] text-[10px] font-mono">Fluid Transitions</p>
            </div>
          </div>
        </section>

        {/* Platform Core Team */}

        <section className="space-y-6">
          <h3 className="font-serif font-bold text-[#1C1B18] text-xl">
            Initiative Founders
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">

            <div className="p-6 border border-[#DCD4C8] bg-[#EAE4DC] rounded-3xl shadow-xs text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-[#1C1B18] text-[#C48B3F] flex items-center justify-center font-serif font-bold text-lg mx-auto">
                PP
              </div>
              <div>
                <h4 className="font-serif font-bold text-[#1C1B18]">Poonam Poddar</h4>
              </div>
            </div>

            <div className="p-6 border border-[#DCD4C8] bg-[#EAE4DC] rounded-3xl shadow-xs text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-[#1C1B18] text-[#C48B3F] flex items-center justify-center font-serif font-bold text-lg mx-auto">
                AR
              </div>
              <div>
                <h4 className="font-serif font-bold text-[#1C1B18]">Ayushi Rai</h4>
              </div>
            </div>

            <div className="p-6 border border-[#DCD4C8] bg-[#EAE4DC] rounded-3xl shadow-xs text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-[#1C1B18] text-[#C48B3F] flex items-center justify-center font-serif font-bold text-lg mx-auto">
                PS
              </div>
              <div>
                <h4 className="font-serif font-bold text-[#1C1B18]">Priyanshi Shah</h4>
              </div>
            </div>

            <div className="p-6 border border-[#DCD4C8] bg-[#EAE4DC] rounded-3xl shadow-xs text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-[#1C1B18] text-[#C48B3F] flex items-center justify-center font-serif font-bold text-lg mx-auto">
                KY
              </div>
              <div>
                <h4 className="font-serif font-bold text-[#1C1B18]">Karishma Yadav</h4>
              </div>
            </div>

          </div>
        </section>


        {/* FAQs */}
        <section className="bg-[#EAE4DC] border border-[#DCD4C8] rounded-3xl p-8 shadow-xs space-y-6">
          <div className="flex items-center gap-3">
            <HelpCircle className="w-6 h-6 text-[#C48B3F]" />
            <h3 className="font-serif font-bold text-[#1C1B18] text-lg">Frequently Asked Questions</h3>
          </div>

          <div className="divide-y divide-[#DCD4C8]">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={idx} className="py-4">
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full flex justify-between items-center text-left font-serif font-bold text-[#1C1B18] text-sm hover:text-[#C48B3F] transition-colors cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-[#666157] shrink-0" /> : <ChevronDown className="w-4 h-4 text-[#666157] shrink-0" />}
                  </button>
                  {isOpen && (
                    <p className="text-[#666157] mt-3 text-xs leading-relaxed animate-fadeInUp">
                      {faq.a}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Help Banner */}
        <section className="p-8 bg-[#EAE4DC] border border-[#DCD4C8] rounded-3xl flex flex-col md:flex-row justify-between items-center gap-6 shadow-xs">
          <div className="space-y-1 text-center md:text-left">
            <p className="font-serif font-bold text-[#1C1B18]">Have questions or want to register as an NGO?</p>
            <p className="text-xs text-[#666157]">Get in touch with our team for guidance or validation reviews.</p>
          </div>
          <Button variant="primary" onClick={() => navigate('/contact')} className="rounded-full bg-[#1C1B18] text-white hover:bg-[#C48B3F]">
            Contact Support
          </Button>
        </section>

      </main>

      <Footer />
    </div>
  );
}
