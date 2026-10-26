import React from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import { AlertCircle, Home, Search } from 'lucide-react';
import { Button } from '../components/ui/Button';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-[#F3F0EA] font-sans">
      <Navbar />

      <main className="flex-grow max-w-md mx-auto w-full p-6 flex flex-col justify-center text-center space-y-6 pt-24">
        
        <div className="bg-[#EAE4DC] border border-[#DCD4C8] rounded-3xl p-8 shadow-xs space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-rose-100 border border-rose-300 flex items-center justify-center mx-auto text-rose-800">
            <AlertCircle className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-serif font-bold tracking-tight text-[#1C1B18]">404: Page Not Found</h1>
            <p className="text-xs text-[#666157] max-w-sm mx-auto leading-relaxed">
              The path coordinate you requested is either moved, deprecated, or does not exist on the DonateBridge ledger index.
            </p>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center max-w-xs mx-auto w-full">
            <Button variant="primary" className="w-full text-xs font-medium rounded-full bg-[#1C1B18] text-white hover:bg-[#C48B3F]" onClick={() => navigate('/')} icon={Home}>
              Return Home
            </Button>
            <Button variant="secondary" className="w-full text-xs font-medium rounded-full bg-[#F3F0EA] border border-[#DCD4C8] text-[#1C1B18]" onClick={() => navigate('/discover')} icon={Search}>
              Browse Directory
            </Button>
          </div>
        </div>

      </main>

      <Footer />
    </div>
  );
}
