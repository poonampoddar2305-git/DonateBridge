import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/ui/Toast';
import {
  Send, ShieldCheck, Phone, Video, Search, MessageSquare, Check, CheckCheck,
  Sparkles, AlertCircle, Paperclip, Image, MapPin, Eye, X, Info, Truck, Calendar, ShoppingBag
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import Navbar from '../components/layout/Navbar';
import { chatAPI, getApiError } from '../api/index';
import { useAuth, useSocket } from '../context/GlobalStateContext';

export default function ChatTerminal() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  const { addNotification } = useSocket();

  const [activeChannel, setActiveChannel] = useState(null);
  const [typedMessage, setTypedMessage] = useState('');
  const [channels, setChannels] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('contacts'); // 'contacts' | 'conversations'
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  // Fetch Available Contacts
  const fetchContacts = async (query = '') => {
    if (!isAuthenticated) return;
    try {
      const res = await chatAPI.getContacts(query);
      setContacts(res.data);
    } catch (err) {
      console.error("Failed to load contacts:", err);
    }
  };

  // Fetch Channels on mount
  const fetchChannels = async (showLoading = true) => {
    if (!isAuthenticated) return;
    try {
      if (showLoading) setLoading(true);
      const res = await chatAPI.getChannels();
      setChannels(res.data);
      if (res.data.length > 0 && !activeChannel) {
        setActiveChannel(res.data[0].id);
      }
    } catch (err) {
      console.error("Failed to load chat channels:", err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchChannels();
      fetchContacts('');
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const handleStartChat = async (otherUserId) => {
    try {
      const res = await chatAPI.createChannel(otherUserId);
      const chan = res.data;
      await fetchChannels(false);
      setActiveChannel(chan.id);
      setActiveTab('conversations');
      toast.success("Conversation opened.");
    } catch (err) {
      toast.error(getApiError(err));
    }
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (activeTab === 'contacts') {
      fetchContacts(val);
    }
  };

  // Fetch messages for active channel
  const fetchMessages = async (channelId) => {
    if (!channelId) return;
    try {
      const res = await chatAPI.getMessages(channelId);
      setMessages(res.data);
    } catch (err) {
      console.error("Failed to load channel messages:", err);
    }
  };


  useEffect(() => {
    if (isAuthenticated) {
      fetchChannels();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Setup WebSocket for active channel
  const ws = useRef(null);
  const [wsStatus, setWsStatus] = useState('DISCONNECTED');

  useEffect(() => {
    if (!activeChannel) return;
    fetchMessages(activeChannel);

    const token = localStorage.getItem('token');
    if (!token) return;

    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const wsProtocol = apiBase.startsWith('https') ? 'wss:' : 'ws:';
    const host = apiBase.replace(/^https?:\/\//, '');
    const wsUrl = `${wsProtocol}//${host}/ws/chat/${activeChannel}/?token=${encodeURIComponent(token)}`;

    setWsStatus('CONNECTING');
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      setWsStatus('CONNECTED');
    };

    ws.current.onmessage = (event) => {
      try {
        const newMsg = JSON.parse(event.data);
        if (newMsg.error) {
          toast.error(newMsg.error);
          return;
        }
        setMessages(prev => {
          if (prev.find(m => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
        setChannels(prev => prev.map(ch => ch.id === activeChannel ? {
          ...ch,
          lastMsg: newMsg.message_type === 'text' ? newMsg.text : `Sent a ${newMsg.message_type}`,
          time: 'Just now'
        } : ch));
        if (newMsg && !newMsg.self && addNotification) {
          addNotification({
            id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            type: 'match',
            title: `New Message from ${newMsg.sender_name || 'Contact'}`,
            message: newMsg.text || `Sent a ${newMsg.message_type || 'file'}`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            read: false
          });
        }
      } catch (err) {
        console.error("Failed to parse WebSocket chat message:", err);
      }
    };

    ws.current.onerror = (error) => {
      console.error("WebSocket chat error:", error);
      setWsStatus('DISCONNECTED');
    };

    ws.current.onclose = () => {
      setWsStatus('DISCONNECTED');
    };

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [activeChannel, toast]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (textToSend, type = 'text', mediaUrl = null, lat = null, lng = null) => {
    if (!activeChannel || !ws.current || ws.current.readyState !== WebSocket.OPEN) {
      toast.error("Connecting to chat... please wait.");
      return;
    }
    setSending(true);
    try {
      ws.current.send(JSON.stringify({
        message_type: type,
        text: textToSend,
        media_url: mediaUrl,
        lat: lat,
        lng: lng
      }));
      setTypedMessage('');
    } catch (err) {
      console.error(err);
      toast.error("Failed to send message via WebSocket.");
    } finally {
      setSending(false);
    }
  };

  const handleTextSubmit = (e) => {
    e.preventDefault();
    if (!typedMessage.trim()) return;
    handleSendMessage(typedMessage.trim(), 'text');
  };

  const currentChannel = channels.find(c => c.id === activeChannel);

  return (
    <div className="min-h-screen flex flex-col bg-[#F3F0EA] font-sans">
      <Navbar />

      <div className="flex-1 flex flex-col lg:flex-row max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 pt-24 gap-6 items-stretch min-h-160">
        
        {/* Column 1: Contacts & Threads list */}
        <aside className="w-full lg:w-80 bg-[#EAE4DC] border border-[#DCD4C8] rounded-3xl flex flex-col shrink-0 shadow-xs overflow-hidden text-left">
          <div className="p-4 border-b border-[#DCD4C8] space-y-3">
            <h3 className="font-serif font-bold text-[#1C1B18]">Messages & Directory</h3>
            
            {/* Tab selection */}
            <div className="flex p-1 bg-[#F3F0EA] rounded-full border border-[#DCD4C8] text-xs font-medium">
              <button
                type="button"
                onClick={() => setActiveTab('contacts')}
                className={`flex-1 py-1.5 rounded-full transition-all cursor-pointer ${
                  activeTab === 'contacts' ? 'bg-[#1C1B18] text-white font-bold' : 'text-[#666157] hover:text-[#1C1B18]'
                }`}
              >
                Available ({contacts.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('conversations')}
                className={`flex-1 py-1.5 rounded-full transition-all cursor-pointer ${
                  activeTab === 'conversations' ? 'bg-[#1C1B18] text-white font-bold' : 'text-[#666157] hover:text-[#1C1B18]'
                }`}
              >
                Chats ({channels.length})
              </button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-[#666157] absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder={activeTab === 'contacts' ? "Search contacts or city..." : "Search chat history..."}
                className="w-full pl-10 pr-4 py-2 rounded-full border border-[#DCD4C8] bg-[#F3F0EA] text-[#1C1B18] focus:outline-none focus:border-[#C48B3F] placeholder-[#666157] text-xs font-medium"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {activeTab === 'contacts' ? (
              contacts.length === 0 ? (
                <div className="text-center py-8 text-[#666157] text-xs font-mono">
                  No contacts found in directory.
                </div>
              ) : (
                contacts.map((contact) => (
                  <div
                    key={`${contact.role}-${contact.id}`}
                    className="p-3.5 rounded-2xl border border-[#DCD4C8] bg-[#F3F0EA] hover:border-[#C48B3F] transition-all flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-xl shrink-0">{contact.avatar || (contact.role === 'ngo' ? '🏫' : '🙋‍♂️')}</span>
                      <div className="min-w-0">
                        <p className="font-serif font-bold text-xs text-[#1C1B18] truncate flex items-center gap-1">
                          {contact.name}
                          {contact.role === 'ngo' && <ShieldCheck className="w-3.5 h-3.5 text-[#C48B3F] shrink-0" />}
                        </p>
                        <p className="text-[10px] text-[#666157] font-mono flex items-center gap-1 truncate mt-0.5">
                          <MapPin className="w-3 h-3 text-[#C48B3F] shrink-0" />
                          {contact.city}, {contact.state}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      onClick={() => handleStartChat(contact.user_id)}
                      className="bg-[#1C1B18] hover:bg-[#C48B3F] text-white text-[10px] font-bold px-3 py-1.5 rounded-full shrink-0 cursor-pointer"
                    >
                      Chat
                    </Button>
                  </div>
                ))
              )
            ) : (
              loading ? (
                <div className="text-center py-8 text-[#666157] text-xs font-mono">Loading conversations…</div>
              ) : channels.length === 0 ? (
                <div className="text-center py-8 text-[#666157] text-xs font-mono">No active chat conversations.</div>
              ) : (
                channels
                  .filter(ch => !searchQuery || ch.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((ch) => (
                    <div
                      key={ch.id}
                      onClick={() => setActiveChannel(ch.id)}
                      className={`p-3.5 rounded-2xl cursor-pointer transition-all border ${
                        activeChannel === ch.id
                          ? 'bg-[#F3F0EA] border-[#C48B3F] text-[#1C1B18] font-bold shadow-xs'
                          : 'border-transparent hover:bg-[#F3F0EA]/50'
                      }`}
                    >
                      <div className="flex justify-between items-center text-xs">
                        <div className="font-serif font-bold flex items-center gap-1 text-[#1C1B18]">
                          {ch.name}
                          {ch.verified && <ShieldCheck className="w-4 h-4 text-[#C48B3F] shrink-0" />}
                        </div>
                        <span className="font-mono text-[10px] text-[#666157]">{ch.time}</span>
                      </div>
                      <p className="truncate mt-1 text-[#666157] font-medium text-xs">{ch.lastMsg}</p>
                    </div>
                  ))
              )
            )}
          </div>
        </aside>


        {/* Column 2: Message flow screen */}
        <main className="flex-1 flex flex-col bg-[#EAE4DC] border border-[#DCD4C8] rounded-3xl shadow-xs overflow-hidden min-h-120 text-left">
          {/* Active channel header */}
          <div className="p-5 border-b border-[#DCD4C8] flex justify-between items-center bg-[#EAE4DC]">
            {currentChannel ? (
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-serif font-bold flex items-center gap-1.5 text-[#1C1B18]">
                    {currentChannel.name}
                    {currentChannel.verified && <ShieldCheck className="w-4.5 h-4.5 text-[#C48B3F] shrink-0" />}
                  </p>
                  {wsStatus === 'CONNECTED' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#F3F0EA] text-[#C48B3F] border border-[#DCD4C8]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#C48B3F] animate-pulse"></span> LIVE
                    </span>
                  )}
                  {wsStatus === 'CONNECTING' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#F3F0EA] text-amber-800 border border-[#DCD4C8]">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span> CONNECTING
                    </span>
                  )}
                  {wsStatus === 'DISCONNECTED' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#F3F0EA] text-[#666157] border border-[#DCD4C8]">
                      OFFLINE
                    </span>
                  )}
                </div>
                <p className="text-[#666157] text-xs mt-0.5">Secure NGO matching chat &bull; Encrypted logs</p>
              </div>
            ) : (
              <div>
                <p className="font-serif font-bold text-[#1C1B18]">No Conversation Selected</p>
                <p className="text-[#666157] text-xs mt-0.5">Select an active user chat to begin</p>
              </div>
            )}

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-bold text-[#666157] px-3 py-1 bg-[#F3F0EA] rounded-full border border-[#DCD4C8] uppercase tracking-wider">
                Direct Text Messaging
              </span>
            </div>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-[#F3F0EA]">
            {!isAuthenticated ? (
              <div className="text-center py-16 text-[#666157] space-y-3">
                <AlertCircle className="w-8 h-8 text-[#C48B3F] mx-auto" />
                <p className="font-serif font-bold text-[#1C1B18]">Authentication Required</p>
                <p className="text-xs">Sign in to coordinate with matches.</p>
                <Button onClick={() => navigate('/auth')} className="rounded-full bg-[#1C1B18] text-white">Sign In</Button>
              </div>
            ) : !activeChannel ? (
              <div className="text-center py-16 text-[#666157] text-xs font-mono">
                Select a thread from the side panel to view messages.
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-16 text-[#666157] text-xs font-mono">
                No messages yet. Say hello!
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col max-w-[85%] space-y-1.5 ${
                    msg.self ? 'ml-auto items-end' : 'mr-auto items-start'
                  }`}
                >
                  <span className="text-[#666157] font-mono text-[10px] font-bold">{msg.sender_name}</span>
                  <div
                    className={`p-4 rounded-2xl leading-relaxed shadow-xs text-xs ${
                      msg.self
                        ? 'bg-[#1C1B18] text-white font-medium rounded-tr-none'
                        : 'bg-[#EAE4DC] border border-[#DCD4C8] text-[#1C1B18] rounded-tl-none'
                    }`}
                  >
                    {msg.text}

                    {/* Image attachment rendering */}
                    {msg.message_type === 'image' && msg.media_url && (
                      <div className="mt-3 rounded-xl overflow-hidden border border-[#DCD4C8]">
                        <img src={msg.media_url} alt="attachment" className="max-w-full h-auto object-cover max-h-52" />
                      </div>
                    )}

                    {/* Location attachment rendering */}
                    {msg.message_type === 'location' && (
                      <div className="mt-3 p-3 bg-[#F3F0EA] rounded-xl flex items-center gap-3 border border-[#DCD4C8] text-[#1C1B18]">
                        <MapPin className="w-5 h-5 text-[#C48B3F] shrink-0" />
                        <div>
                          <p className="font-serif font-bold">Handover Address Coordinates</p>
                          <p className="text-[#666157] mt-0.5 font-mono">
                            {msg.lat && msg.lng ? `${msg.lat.toFixed(4)}° N, ${msg.lng.toFixed(4)}° E` : 'Coords shared'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Time & Read Receipts section */}
                  <div className="flex items-center gap-1.5 text-[#666157] font-mono text-[10px]">
                    <span>{msg.time}</span>
                    {msg.self && (
                      <span>
                        {msg.status === 'sent' && <Check className="w-3.5 h-3.5 text-[#666157]" />}
                        {msg.status === 'delivered' && <CheckCheck className="w-3.5 h-3.5 text-[#666157]" />}
                        {msg.status === 'read' && <CheckCheck className="w-3.5 h-3.5 text-[#C48B3F]" />}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Message input bar with attachment shortcuts */}
          <div className="border-t border-[#DCD4C8] bg-[#EAE4DC] p-4 space-y-3 shrink-0">

            <form onSubmit={handleTextSubmit} className="flex gap-3">
              <input
                type="text"
                disabled={!activeChannel || sending}
                placeholder={activeChannel ? "Type message..." : "Select a thread to chat..."}
                value={typedMessage}
                onChange={(e) => setTypedMessage(e.target.value)}
                className="flex-1 px-4 py-3 rounded-2xl border border-[#DCD4C8] bg-[#F3F0EA] text-[#1C1B18] focus:outline-none focus:border-[#C48B3F] placeholder-[#666157] text-xs font-medium"
                required
              />
              <Button type="submit" variant="primary" icon={Send} loading={sending} isDisabled={!activeChannel || sending || !typedMessage.trim()} className="bg-[#1C1B18] hover:bg-[#C48B3F] text-white rounded-full px-5 text-xs font-medium">
                Send
              </Button>
            </form>
          </div>
        </main>

        {/* Column 3: Direct Coordination Guide */}
        <aside className="hidden xl:flex w-80 bg-[#EAE4DC] border border-[#DCD4C8] rounded-3xl flex-col shrink-0 shadow-xs p-5 space-y-6 overflow-y-auto text-left">
          <div>
            <h4 className="font-serif font-bold text-[#1C1B18]">Direct Handover</h4>
            <p className="text-[#666157] text-xs mt-0.5">Self-delivery coordination guidelines</p>
          </div>

          {/* Stepper Status */}
          <div className="space-y-4">
            <h5 className="text-[#666157] uppercase font-mono tracking-wider font-bold text-[10px]">Coordination Steps</h5>
            <div className="space-y-3.5 text-xs">
              <div className="flex gap-3 items-start">
                <div className="w-6 h-6 rounded-full bg-[#F3F0EA] text-[#C48B3F] border border-[#DCD4C8] flex items-center justify-center font-mono font-bold shrink-0">1</div>
                <div>
                  <p className="font-serif font-bold text-[#1C1B18]">Agree via Chat</p>
                  <p className="text-[#666157] text-[11px]">Confirm item availability & quantities directly.</p>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <div className="w-6 h-6 rounded-full bg-[#F3F0EA] text-[#C48B3F] border border-[#DCD4C8] flex items-center justify-center font-mono font-bold shrink-0">2</div>
                <div>
                  <p className="font-serif font-bold text-[#1C1B18]">Exchange Details</p>
                  <p className="text-[#666157] text-[11px]">Share pickup address and preferred time slot.</p>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <div className="w-6 h-6 rounded-full bg-[#F3F0EA] text-[#C48B3F] border border-[#DCD4C8] flex items-center justify-center font-mono font-bold shrink-0">3</div>
                <div>
                  <p className="font-serif font-bold text-[#1C1B18]">Direct Physical Transfer</p>
                  <p className="text-[#666157] text-[11px]">Donor or NGO handles physical delivery directly.</p>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <div className="w-6 h-6 rounded-full bg-[#F3F0EA] text-[#C48B3F] border border-[#DCD4C8] flex items-center justify-center font-mono font-bold shrink-0">4</div>
                <div>
                  <p className="font-serif font-bold text-[#1C1B18]">Confirm Receipt</p>
                  <p className="text-[#666157] text-[11px]">Acknowledge successful item handover.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Self delivery note */}
          <div className="border-t border-[#DCD4C8] pt-5 space-y-2 text-xs">
            <h5 className="text-[#666157] uppercase font-mono tracking-wider font-bold text-[10px]">Self-Delivery Policy</h5>
            <p className="text-[#666157] text-[11px] leading-relaxed">
              DonateBridge facilitates direct communication between Donors and Organizations. We do not operate third-party courier or transport services.
            </p>
          </div>
        </aside>

      </div>
    </div>
  );
}
