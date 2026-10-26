import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, MapPin, Building2, ShieldCheck, ArrowRight, AlertCircle, RefreshCw, Cpu, HelpCircle, Bot, User, BookOpen, Database, Target, FileText } from 'lucide-react';
import { aiAPI, getApiError } from '../../api/index';
import { useToast } from './Toast';

const INITIAL_WELCOME = {
  role: 'assistant',
  text: 'Hello! I am your DonateBridge AI & Knowledge Assistant. You can ask me platform questions (e.g., "How does NGO verification work?", "What are the 6 logistics steps?"), ask about live data ("Which NGOs need blankets?"), or describe what you want to donate.',
  type: 'knowledge',
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
};

const SAMPLE_PROMPTS = [
  "How does NGO verification work?",
  "What are the 6 logistics tracking steps?",
  "Which NGOs currently need blankets?",
  "I have 20 blankets and winter clothes to donate."
];

export default function AiMatchAssistant({ onPreFillForm }) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([INITIAL_WELCOME]);
  const [latestResult, setLatestResult] = useState(null);
  const [aiHealth, setAiHealth] = useState({ available: true, model: 'llama3:latest' });
  const chatContainerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const hasUserInteracted = useRef(false);
  const { toast } = useToast();

  useEffect(() => {
    aiAPI.checkHealth()
      .then(res => setAiHealth(res.data))
      .catch(() => setAiHealth({ available: false }));
  }, []);

  const scrollToBottom = (behavior = 'smooth') => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior
      });
    }
  };

  useEffect(() => {
    // Only scroll within the chat box if the user has actually interacted.
    // Never scroll the outer browser window!
    if (hasUserInteracted.current) {
      scrollToBottom('smooth');
    }
  }, [messages, loading]);


  const handleSendMessage = async (textToSubmit) => {
    const messageText = textToSubmit || prompt;
    if (!messageText.trim()) return;

    const userMsg = {
      role: 'user',
      text: messageText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setPrompt('');
    setLoading(true);

    try {
      let lat = null;
      let lng = null;
      if (navigator.geolocation) {
        try {
          const pos = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000 });
          });
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
        } catch {
          // No location fallback - do not inject fake coordinates
        }
      }

      const historyPayload = messages
        .filter(m => m.text)
        .map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text }));

      const res = await aiAPI.donationAssistant(messageText, lat, lng, historyPayload);
      const data = res.data;
      setLatestResult(data);

      let replyText = data.explanation || data.answer || data.message || "I found relevant platform details for your query.";
      if (data.requires_clarification) {
        replyText = data.clarification_question || "Could you please clarify what items you would like to donate?";
      }

      const assistantMsg = {
        role: 'assistant',
        text: replyText,
        type: data.type || 'smart_match',
        data: data,
        sources: data.sources || [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      toast.error(getApiError(err));
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          text: 'Sorry, I encountered an error processing your request. Please try again.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setMessages([INITIAL_WELCOME]);
    setLatestResult(null);
    setPrompt('');
  };

  const renderTypeBadge = (type) => {
    if (type === 'knowledge') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 font-mono font-bold text-[10px] uppercase">
          <BookOpen className="w-3 h-3" /> Knowledge Answer
        </span>
      );
    }
    if (type === 'live_data') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-mono font-bold text-[10px] uppercase">
          <Database className="w-3 h-3" /> Live Platform Data
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-[#4A7C59] border border-emerald-200 font-mono font-bold text-[10px] uppercase">
        <Target className="w-3 h-3" /> Donation Match
      </span>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 sm:p-8 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-md shadow-emerald-900/10 shrink-0">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display font-black text-slate-900 text-xl tracking-tight">RAG Knowledge & Donation Assistant</h2>
              <span className={`px-2.5 py-0.5 rounded-full font-mono font-bold text-[10px] uppercase border ${
                aiHealth.available 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}>
                {aiHealth.ollama_available 
                  ? `Ollama (${aiHealth.model || 'llama3'}) Connected`
                  : (aiHealth.available ? 'RAG Knowledge Engine Active' : 'AI Standby Mode')}
              </span>
            </div>

            <p className="text-slate-500 text-xs font-medium mt-0.5">
              Grounded platform Q&A from documentation, real-time database queries, and Smart-Match NGO ranking.
            </p>
          </div>
        </div>

        <button
          onClick={handleClear}
          className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Clear Chat
        </button>
      </div>

      {/* Conversation Thread */}
      <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
        {messages.map((msg, index) => (
          <div key={index} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-[#4A7C59] flex items-center justify-center shrink-0 mt-1">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div className={`max-w-2xl space-y-3 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              
              {/* Message Mode Badge */}
              {msg.role === 'assistant' && msg.type && (
                <div className="flex items-center gap-2">
                  {renderTypeBadge(msg.type)}
                </div>
              )}

              <div className={`p-4 rounded-2xl text-xs font-medium leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-slate-900 text-white rounded-tr-none'
                  : 'bg-slate-50 border border-slate-200/80 text-slate-800 rounded-tl-none'
              }`}>
                <p className="whitespace-pre-line">{msg.text}</p>
                <span className={`block text-[10px] mt-1.5 ${msg.role === 'user' ? 'text-slate-400 text-right' : 'text-slate-400'}`}>
                  {msg.timestamp}
                </span>
              </div>

              {/* Source Citations */}
              {msg.sources && msg.sources.length > 0 && (
                <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1 text-[10px]">
                  <span className="font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <FileText className="w-3 h-3 text-slate-500" /> Grounded Source Citations:
                  </span>
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {msg.sources.map((src, sIdx) => {
                      const cleanSource = src.source ? src.source.replace('.md', '').replace('_', ' ') : 'DonateBridge Context';
                      return (
                        <span key={sIdx} className="px-2 py-0.5 bg-white border border-slate-200 text-slate-700 font-mono font-medium rounded-md">
                          {cleanSource} {src.section ? `(${src.section})` : ''}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Extended Assistant Payload Render */}
              {msg.data && (
                <div className="space-y-4 pt-1">
                  
                  {/* Clarification Alert */}
                  {msg.data.requires_clarification && (
                    <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl space-y-3">
                      <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Clarification Required</span>
                      </div>
                      <p className="text-amber-800 text-xs font-medium">
                        {msg.data.clarification_question}
                      </p>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {["Donate Blankets", "Donate Food Rations", "Donate Clothes", "Donate Books"].map((chip, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSendMessage(chip)}
                            className="px-3 py-1.5 bg-white border border-amber-200 hover:bg-amber-100 text-amber-900 text-xs font-bold rounded-lg transition-all cursor-pointer"
                          >
                            {chip}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Intent Badges */}
                  {msg.data.intent && msg.data.intent.items && msg.data.intent.items.length > 0 && (
                    <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Understood Intent</span>
                      <div className="flex flex-wrap gap-2">
                        {msg.data.intent.items.map((it, idx) => (
                          <span key={idx} className="px-2.5 py-1 bg-slate-100 text-slate-800 rounded-lg text-xs font-bold flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            {it.quantity ? `${it.quantity}x ` : ''}{it.item} ({it.category})
                          </span>
                        ))}
                        {msg.data.intent.location && (
                          <span className="px-2.5 py-1 bg-slate-100 text-slate-800 rounded-lg text-xs font-bold flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-emerald-600" /> {msg.data.intent.location}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* NGO Recommendation Cards */}
                  {msg.data.matches && msg.data.matches.length > 0 && (
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">
                          Verified NGO Matches ({msg.data.matches.length})
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          DonateBridge Smart Score
                        </span>
                      </div>

                      {msg.data.matches.map((match, idx) => {
                        const ngo = match.ngo;
                        const need = match.need;
                        const factors = match.factors || {};

                        return (
                          <div key={idx} className="p-5 bg-[#EAE4DC] border border-[#DCD4C8] rounded-3xl shadow-xs space-y-3 text-left">
                            
                            <div className="flex justify-between items-start gap-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-[#F3F0EA] border border-[#DCD4C8] flex items-center justify-center text-[#1C1B18] shrink-0">
                                  <Building2 className="w-5 h-5 text-[#C48B3F]" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-serif font-bold text-[#1C1B18] text-sm">{ngo.name}</h4>
                                    {ngo.verification_status === 'approved' && (
                                      <ShieldCheck className="w-4 h-4 text-[#C48B3F] shrink-0" />
                                    )}
                                  </div>
                                  <p className="text-[#666157] text-[11px] font-medium">
                                    {ngo.city}, {ngo.state} &bull; Type: {ngo.ngo_type || 'Trust'}
                                  </p>
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <span className="inline-flex items-center gap-1 px-3 py-1 bg-[#F3F0EA] text-[#C48B3F] border border-[#DCD4C8] rounded-full font-bold text-xs">
                                  Score: {match.score}%
                                </span>
                              </div>
                            </div>

                            <div className="p-3 bg-[#F3F0EA] rounded-2xl text-xs flex justify-between items-center border border-[#DCD4C8]">
                              <div>
                                <span className="text-[#666157] font-medium">Demand: </span>
                                <strong className="text-[#1C1B18] font-bold">{need.item} ({need.quantity} units)</strong>
                              </div>
                              <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 font-mono font-bold text-[10px] uppercase border border-rose-200">
                                {need.urgency} Urgency
                              </span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-medium">
                              <div className="p-2 bg-[#F3F0EA] rounded-xl text-center border border-[#DCD4C8]">
                                <span className="text-[#666157] block">Category Fit</span>
                                <strong className="text-[#1C1B18] font-bold">{factors.category_score || 30}/30 pts</strong>
                              </div>
                              <div className="p-2 bg-[#F3F0EA] rounded-xl text-center border border-[#DCD4C8]">
                                <span className="text-[#666157] block">Distance ({factors.distance_km || 0} km)</span>
                                <strong className="text-[#1C1B18] font-bold">{factors.distance_score || 20}/20 pts</strong>
                              </div>
                              <div className="p-2 bg-[#F3F0EA] rounded-xl text-center border border-[#DCD4C8]">
                                <span className="text-[#666157] block">Urgency</span>
                                <strong className="text-[#1C1B18] font-bold">{factors.urgency_score || 15}/15 pts</strong>
                              </div>
                              <div className="p-2 bg-[#F3F0EA] rounded-xl text-center border border-[#DCD4C8]">
                                <span className="text-[#666157] block">Trust Index</span>
                                <strong className="text-[#1C1B18] font-bold">{factors.trust_score_pts || 10}/10 pts</strong>
                              </div>
                            </div>

                            {onPreFillForm && (
                              <div className="pt-1 flex justify-end">
                                <button
                                  onClick={() => {
                                    const itemObj = msg.data.intent?.items?.[0] || {};
                                    onPreFillForm({
                                      itemName: itemObj.item || need.item,
                                      category: itemObj.category ? (itemObj.category.charAt(0).toUpperCase() + itemObj.category.slice(1)) : 'Clothing',
                                      quantity: itemObj.quantity || need.quantity || 1,
                                      description: `Matched donation for ${ngo.name}'s request (${need.item}).`,
                                      targetNgoId: ngo.id
                                    });
                                  }}
                                  className="px-5 py-2 bg-[#1C1B18] hover:bg-[#C48B3F] text-white font-medium text-xs rounded-full transition-all flex items-center gap-2 cursor-pointer shadow-xs"
                                >
                                  Pre-fill Form <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}

                          </div>
                        );
                      })}
                    </div>
                  )}

                </div>
              )}

            </div>

            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 mt-1">
                <User className="w-4 h-4" />
              </div>
            )}

          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-[#4A7C59] flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl rounded-tl-none text-xs font-medium text-emerald-900 flex items-center gap-2">
              <Cpu className="w-4 h-4 animate-spin text-emerald-600" />
              <span>Retrieving vector knowledge & searching live database...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form & Quick Chips */}
      <div className="space-y-3 pt-2">
        <div className="relative">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            rows={2}
            disabled={loading}
            placeholder="Ask a platform question (e.g., 'How does NGO verification work?'), live data ('Which NGOs need blankets?'), or donation offer..."
            className="w-full bg-slate-50 border border-slate-200 p-4 pr-32 rounded-2xl text-slate-900 font-medium text-sm focus:outline-none focus:border-emerald-500 placeholder-slate-400 disabled:opacity-50"
          />

          <button
            onClick={() => handleSendMessage()}
            disabled={loading || !prompt.trim()}
            className="absolute bottom-3.5 right-3.5 px-5 py-2 py-2.5 bg-slate-900 hover:bg-[#4A7C59] disabled:bg-slate-300 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-sm disabled:cursor-not-allowed"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
            ) : (
              <>
                Send <Send className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>

        {/* Quick Sample Prompts */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Try Asking:</span>
          {SAMPLE_PROMPTS.map((sample, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(sample)}
              disabled={loading}
              className="px-3 py-1.5 bg-slate-50 hover:bg-emerald-50 hover:text-[#4A7C59] border border-slate-200/80 hover:border-emerald-200 rounded-xl text-xs font-medium text-slate-600 transition-all cursor-pointer truncate max-w-xs"
            >
              "{sample}"
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}
