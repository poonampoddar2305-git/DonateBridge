import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../context/GlobalStateContext';
import { Bell, ShieldAlert, Truck, Check, Trash2, CheckSquare, MailOpen, MessageSquare } from 'lucide-react';
import { Button } from '../components/ui/Button';
import Navbar from '../components/layout/Navbar';
import { notificationAPI } from '../api/index';

export default function NotificationCenter() {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAllRead, setNotifications, setUnreadCount } = useSocket();
  const [filterTab, setFilterTab] = useState('All'); // 'All' | 'Unread' | 'Deliveries' | 'Messages' | 'Security'

  const handleArchive = (id) => {
    const target = notifications.find(n => n.id === id);
    if (target && !target.read) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleMarkOneRead = async (id) => {
    try {
      if (typeof id === 'number') {
        await notificationAPI.markRead(id);
      }
    } catch (e) {
      console.error("Failed to mark notification as read", e);
    }
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const filteredNotifications = notifications.filter(n => {
    if (filterTab === 'Unread') return !n.read;
    if (filterTab === 'Deliveries') return n.type === 'delivery' || n.type === 'match';
    if (filterTab === 'Messages') return n.type === 'chat';
    if (filterTab === 'Security') return n.type === 'security' || n.type === 'system';
    return true;
  });

  return (
    <div className="min-h-screen flex flex-col bg-[#F3F0EA] font-sans">
      <Navbar />

      <main className="grow max-w-5xl mx-auto w-full px-6 py-10 pt-24 text-left space-y-6">
        {/* Title bar */}
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div className="space-y-1">
              <h1 className="font-serif font-bold text-[#1C1B18] text-2xl flex items-center gap-2.5">
                <Bell className="w-6 h-6 text-[#C48B3F] animate-bounce" /> Notifications
                {unreadCount > 0 && (
                  <span className="px-3 py-0.5 border border-[#DCD4C8] bg-[#EAE4DC] text-[#C48B3F] rounded-full font-mono text-xs font-bold uppercase tracking-wider">
                    {unreadCount} Unread
                  </span>
                )}
              </h1>
              <p className="text-xs text-[#666157] font-medium">Track your donation milestones, delivery pickups, and account updates.</p>
            </div>

            {unreadCount > 0 && (
              <Button variant="secondary" onClick={markAllRead} icon={CheckSquare} className="rounded-full bg-[#EAE4DC] border border-[#DCD4C8] text-[#1C1B18] text-xs">
                Mark All Read
              </Button>
            )}
          </div>

          {/* Tab Filters */}
          <div className="flex border-b border-[#DCD4C8] gap-3">
            {['All', 'Unread', 'Deliveries', 'Messages', 'Security'].map(tab => (
              <button
                key={tab}
                onClick={() => setFilterTab(tab)}
                className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-all cursor-pointer ${
                  filterTab === tab
                    ? 'border-[#C48B3F] text-[#1C1B18] font-bold'
                    : 'border-transparent text-[#666157] hover:text-[#1C1B18]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Stream List */}
          <div className="space-y-4">
            {filteredNotifications.length === 0 ? (
              <div className="text-center py-20 text-[#666157] bg-[#EAE4DC] border border-[#DCD4C8] rounded-3xl shadow-xs space-y-3">
                <MailOpen className="w-10 h-10 text-[#C48B3F] mx-auto" />
                <p className="font-serif font-bold text-[#1C1B18]">All clear!</p>
                <p className="text-xs">You don't have any notifications under this category.</p>
              </div>
            ) : (
              filteredNotifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-5 transition-all duration-200 bg-[#EAE4DC] border rounded-3xl shadow-xs ${
                    notif.read ? 'border-[#DCD4C8] opacity-75' : 'border-[#C48B3F] bg-[#F3F0EA]'
                  }`}
                >
                  <div className="flex gap-4">
                    {/* Icon depending on type */}
                    <div className="shrink-0 pt-0.5">
                      {notif.type === 'delivery' ? (
                        <div className="w-10 h-10 rounded-2xl bg-[#F3F0EA] text-[#C48B3F] flex items-center justify-center border border-[#DCD4C8]">
                          <Truck className="w-5 h-5" />
                        </div>
                      ) : notif.type === 'match' ? (
                        <div className="w-10 h-10 rounded-2xl bg-[#F3F0EA] text-[#C48B3F] flex items-center justify-center border border-[#DCD4C8]">
                          <Check className="w-5 h-5" />
                        </div>
                      ) : notif.type === 'chat' ? (
                        <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center border border-amber-300">
                          <MessageSquare className="w-5 h-5" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-800 flex items-center justify-center border border-rose-300">
                          <ShieldAlert className="w-5 h-5" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 space-y-3">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          {notif.title && (
                            <h4 className="font-serif font-bold text-[#1C1B18] text-sm mb-1">{notif.title}</h4>
                          )}
                          <p className={`leading-relaxed text-xs ${notif.read ? 'text-[#666157] font-normal' : 'text-[#1C1B18] font-medium'}`}>
                            {notif.message}
                          </p>
                        </div>
                        <span className="font-mono text-[10px] text-[#666157] shrink-0 ml-auto">{notif.time}</span>
                      </div>

                      <div className="flex justify-between items-center pt-3 border-t border-[#DCD4C8] font-mono text-[10px] text-[#666157]">
                        <span className="font-bold uppercase">ID: {notif.id}</span>
                        <div className="flex items-center gap-4">
                          {notif.type === 'chat' && (
                            <button
                              onClick={() => navigate('/chat')}
                              className="text-[#1C1B18] hover:text-[#C48B3F] font-bold underline cursor-pointer"
                            >
                              Open Chat →
                            </button>
                          )}
                          {!notif.read && (
                            <button
                              onClick={() => handleMarkOneRead(notif.id)}
                              className="text-[#C48B3F] hover:underline font-bold cursor-pointer"
                            >
                              Mark Read
                            </button>
                          )}
                          <button
                            onClick={() => handleArchive(notif.id)}
                            className="text-[#666157] hover:text-rose-700 flex items-center gap-1 font-bold cursor-pointer"
                            aria-label="Archive notification"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Archive
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
      </main>
    </div>
  );
}
