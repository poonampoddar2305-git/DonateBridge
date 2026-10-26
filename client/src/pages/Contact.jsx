import React, { useState } from 'react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import { Mail, Phone, MapPin, Send, MessageSquare } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { InputField } from '../components/ui/InputField';
import { useToast } from '../components/ui/Toast';
import LeafletMap from '../components/ui/LeafletMap';

const MAP_CENTER = [21.1458, 79.0882];

import { api } from '../context/GlobalStateContext';

export default function Contact() {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'donor', // 'donor' | 'ngo' | 'partner'
    message: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      toast.error('Please fill in all required feedback fields.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post('/api/feedback/', {
        name: formData.name.trim(),
        email: formData.email.trim(),
        role: formData.role,
        message: formData.message.trim()
      });
      toast.success(res.data.message || 'Feedback submitted successfully.');
      setFormData({ name: '', email: '', role: 'donor', message: '' });
    } catch (err) {
      console.error("Feedback submission error:", err);
      const errMsg = err.response?.data?.error || err.response?.data?.message || 'Failed to submit feedback email. Please try again.';
      toast.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const markers = [
    {
      lat: MAP_CENTER[0],
      lng: MAP_CENTER[1],
      popupContent: (
        <div>
          <strong className="font-serif text-[#1C1B18] font-bold">DonateBridge HQ</strong>
          <p className="text-slate-500 text-xs mt-0.5">Lokmanya Nagar, Hingna</p>
        </div>
      )
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#F3F0EA] font-sans">
      <Navbar />

      <main className="flex-grow max-w-5xl mx-auto w-full px-6 py-12 space-y-16 pt-24 text-left">
        
        {/* Header Title */}
        <section className="text-center space-y-4 max-w-3xl mx-auto">
          <span className="px-4 py-1.5 bg-[#EAE4DC] text-[#C48B3F] rounded-full font-mono text-xs font-bold uppercase tracking-wider border border-[#DCD4C8]">
            Get In Touch
          </span>
          <h1 className="font-serif font-bold text-3xl sm:text-4xl text-[#1C1B18] tracking-tight leading-tight">
            We'd love to hear from you
          </h1>
          <p className="text-[#666157] text-sm leading-relaxed max-w-xl mx-auto">
            Have questions about donations, NGO verification, or logistics partnerships? Send us a message.
          </p>
        </section>

        {/* Form and Details Split */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Contact Details & Info */}
          <div className="lg:col-span-5 space-y-6 flex flex-col justify-between">
            <div className="bg-[#EAE4DC] border border-[#DCD4C8] rounded-3xl p-6 shadow-xs space-y-8 flex-grow">
              <h3 className="font-serif font-bold text-[#1C1B18] text-lg">
                Contact Information
              </h3>
              
              <div className="space-y-6 text-xs">
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-2xl bg-[#F3F0EA] flex items-center justify-center text-[#C48B3F] shrink-0 border border-[#DCD4C8]">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-serif font-bold text-[#1C1B18]">Email Us</p>
                    <p className="text-[#666157] mt-1 font-mono">demogmail066@gmail.com</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-2xl bg-[#F3F0EA] flex items-center justify-center text-[#C48B3F] shrink-0 border border-[#DCD4C8]">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-serif font-bold text-[#1C1B18]">Call Us</p>
                    <p className="text-[#666157] mt-1 font-mono">+91 (80) 4567-8900</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-2xl bg-[#F3F0EA] flex items-center justify-center text-[#C48B3F] shrink-0 border border-[#DCD4C8]">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-serif font-bold text-[#1C1B18]">Our Office</p>
                    <p className="text-[#666157] mt-1 leading-relaxed">
                      Lokmanya Nagar, Hingna Nagpur,<br />
                      Maharashtra
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Map wrapper using shared LeafletMap */}
            <div className="h-64 w-full rounded-3xl overflow-hidden shadow-xs border border-[#DCD4C8]">
              <LeafletMap
                center={MAP_CENTER}
                zoom={13}
                markers={markers}
                className="h-full w-full border-none"
              />
            </div>

          </div>

          {/* Contact Form */}
          <div className="lg:col-span-7 bg-[#EAE4DC] border border-[#DCD4C8] rounded-3xl p-6 sm:p-8 shadow-xs">
            <h3 className="font-serif font-bold text-[#1C1B18] text-lg mb-6">
              General Feedback
            </h3>

            <form onSubmit={handleSubmit} className="space-y-6">
              <InputField
                label="Full Name"
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter your name"
                required
              />

              <InputField
                label="Email Address"
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Enter your email"
                required
              />

              {/* Role Selection */}
              <div className="space-y-2">
                <label className="text-xs font-mono font-bold text-[#666157] uppercase tracking-wider block">I am a...</label>
                <div className="grid grid-cols-3 gap-3">
                  {['donor', 'ngo', 'partner'].map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, role }))}
                      className={`py-2.5 px-4 rounded-full font-mono text-xs font-bold capitalize text-center transition-all cursor-pointer ${
                        formData.role === role
                          ? 'bg-[#1C1B18] text-white shadow-xs'
                          : 'bg-[#F3F0EA] border border-[#DCD4C8] text-[#666157] hover:bg-[#EAE4DC]'
                      }`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono font-bold text-[#666157] uppercase tracking-wider block">General Feedback</label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="How can we help you?"
                  rows={4}
                  className="w-full p-4 text-xs text-[#1C1B18] border border-[#DCD4C8] rounded-2xl focus:outline-none focus:border-[#C48B3F] placeholder-[#666157] bg-[#F3F0EA]"
                  required
                />
              </div>

              <div className="pt-4 border-t border-[#DCD4C8]">
                <Button type="submit" variant="primary" loading={submitting} isDisabled={submitting} className="w-full text-xs font-medium rounded-full bg-[#1C1B18] hover:bg-[#C48B3F] text-white" icon={Send}>
                  Submit Feedback
                </Button>
              </div>
            </form>
          </div>

        </section>

      </main>

      <Footer />
    </div>
  );
}
