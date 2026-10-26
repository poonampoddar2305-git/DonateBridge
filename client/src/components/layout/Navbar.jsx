import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth, useSocket } from '../../context/GlobalStateContext';
import { Menu, X, Bell, MessageSquare, User, Settings, LogOut, ChevronDown, Sparkles, HeartHandshake, ShieldCheck } from 'lucide-react';
import { Button } from '../ui/Button';
import { motion, AnimatePresence } from 'framer-motion';

export default function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();
  const { unreadCount } = useSocket();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const currentPath = location.pathname;

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    logout();
    setDropdownOpen(false);
    navigate('/');
  };

  const getNavLinks = () => {
    const baseLinks = [
      { label: 'Discover', path: '/discover' },
      { label: 'Bridge', path: '/bridge' },
      { label: 'About', path: '/about' },
      { label: 'Contact', path: '/contact' }
    ];

    if (!isAuthenticated) return baseLinks;

    if (user?.role === 'admin') {
      return [{ label: 'Admin Console', path: '/admin' }, ...baseLinks];
    } else if (user?.role === 'ngo') {
      return [{ label: 'NGO Console', path: '/ngo' }, ...baseLinks];
    } else {
      return [{ label: 'Donor Hub', path: '/donor' }, ...baseLinks];
    }
  };

  const navLinks = getNavLinks();

  return (
    <header className="sticky top-0 inset-x-0 z-50 bg-[#F3F0EA]/85 backdrop-blur-md border-b border-[#EAE4DC] px-4 sm:px-6 lg:px-8 py-3 transition-all duration-300">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-center justify-between h-12">
          
          {/* Left: Brand logo */}
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-full bg-[#C48B3F] flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform">
                <HeartHandshake className="w-4 h-4" />
              </div>
              <span className="font-serif text-xl font-bold text-[#1C1B18] tracking-tight">
                DonateBridge
              </span>
            </Link>
          </div>

          {/* Middle: Links */}
          <nav className="hidden md:flex items-center space-x-2">
            {navLinks.map((link) => {
              const isActive = currentPath === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-[#1C1B18] text-white shadow-xs'
                      : 'text-[#1C1B18] hover:bg-[#EAE4DC]'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Right: Actions / Auth / User Menu */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <Link
                  to="/chat"
                  className={`p-2 rounded-full transition-all duration-200 relative ${
                    currentPath === '/chat' 
                      ? 'bg-[#EAE4DC] text-[#C48B3F]' 
                      : 'text-[#666157] hover:text-[#1C1B18] hover:bg-[#EAE4DC]'
                  }`}
                  title="Chat Messages"
                >
                  <MessageSquare className="w-5 h-5" />
                </Link>

                <Link
                  to="/notifications"
                  className={`p-2 rounded-full transition-all duration-200 relative ${
                    currentPath === '/notifications' 
                      ? 'bg-[#EAE4DC] text-[#C48B3F]' 
                      : 'text-[#666157] hover:text-[#1C1B18] hover:bg-[#EAE4DC]'
                  }`}
                  title="Notifications"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#C48B3F] rounded-full ring-2 ring-[#F3F0EA] animate-pulse" />
                  )}
                </Link>

                {/* User Dropdown */}
                <div className="relative ml-2">
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full hover:bg-[#EAE4DC] transition-all cursor-pointer border border-[#DCD4C8]"
                  >
                    {user?.avatar && user.avatar.length <= 4 ? (
                      <span className="w-8 h-8 rounded-full bg-[#C48B3F] text-white flex items-center justify-center font-bold text-sm shrink-0">
                        {user.avatar}
                      </span>
                    ) : (
                      <img
                        src={user?.avatar || 'https://api.dicebear.com/7.x/adventurer/svg?seed=guest'}
                        alt="Avatar"
                        className="w-8 h-8 rounded-full bg-white object-cover shrink-0"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://api.dicebear.com/7.x/adventurer/svg?seed=guest';
                        }}
                      />
                    )}
                    <span className="text-xs font-semibold text-[#1C1B18]">{user?.name?.split(' ')[0]}</span>
                    <ChevronDown className={`w-4 h-4 text-[#666157] transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {dropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          transition={{ duration: 0.15, ease: "easeOut" }}
                          className="absolute right-0 mt-3 w-64 rounded-2xl bg-[#F3F0EA] border border-[#DCD4C8] shadow-xl z-20 overflow-hidden"
                        >
                          <div className="p-4 border-b border-[#DCD4C8] bg-[#EAE4DC]/50">
                            <p className="text-sm font-bold text-[#1C1B18] truncate">{user?.name}</p>
                            <p className="text-xs text-[#666157] truncate mt-0.5">{user?.email}</p>
                            <div className="mt-2 inline-flex items-center px-2 py-0.5 rounded-full bg-[#C48B3F]/15 text-[#C48B3F]">
                              <span className="font-mono text-[10px] font-bold uppercase tracking-wider">
                                {user?.role} Account
                              </span>
                            </div>
                          </div>
                          
                          <div className="p-2 space-y-1">
                            {user?.role === 'admin' && (
                              <Link
                                to="/admin"
                                onClick={() => setDropdownOpen(false)}
                                className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-[#1C1B18] hover:bg-[#EAE4DC] transition-colors"
                              >
                                <ShieldCheck className="w-4 h-4 text-[#C48B3F]" /> Admin Console
                              </Link>
                            )}
                            <Link
                              to="/profile"
                              onClick={() => setDropdownOpen(false)}
                              className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-[#1C1B18] hover:bg-[#EAE4DC] transition-colors"
                            >
                              <User className="w-4 h-4 text-[#666157]" /> My Profile
                            </Link>
                            
                            <Link
                              to="/settings"
                              onClick={() => setDropdownOpen(false)}
                              className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-[#1C1B18] hover:bg-[#EAE4DC] transition-colors"
                            >
                              <Settings className="w-4 h-4 text-[#666157]" /> Settings
                            </Link>
                          </div>
                          
                          <div className="p-2 border-t border-[#DCD4C8] bg-[#EAE4DC]/30">
                            <button
                              onClick={handleLogout}
                              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                            >
                              <LogOut className="w-4 h-4" /> Sign out
                            </button>
                          </div>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate('/auth')}
                  className="hidden lg:inline-flex text-sm font-medium text-[#1C1B18] hover:text-[#C48B3F] px-4 py-2"
                >
                  Sign In
                </button>
                <button
                  onClick={() => navigate('/auth?tab=register')}
                  className="rounded-full bg-[#1C1B18] text-white hover:bg-[#C48B3F] px-6 py-2.5 text-sm font-medium transition-all shadow-xs"
                >
                  Register Now
                </button>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-full text-[#1C1B18] hover:bg-[#EAE4DC] transition-colors cursor-pointer"
              aria-label="Toggle menu"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Menu Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden mt-2 mx-2 overflow-hidden rounded-2xl bg-[#F3F0EA] border border-[#DCD4C8] shadow-xl"
          >
            <div className="p-4 space-y-4">
              <nav className="flex flex-col space-y-1.5 bg-[#EAE4DC]/50 p-2 rounded-xl border border-[#DCD4C8]">
                {navLinks.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setIsOpen(false)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      currentPath === link.path
                        ? 'bg-[#1C1B18] text-white'
                        : 'text-[#1C1B18] hover:bg-[#EAE4DC]'
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>

              <div className="border-t border-[#DCD4C8] pt-4 space-y-2">
                {isAuthenticated ? (
                  <div className="space-y-1">
                    <Link
                      to="/chat"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-[#1C1B18] hover:bg-[#EAE4DC]"
                    >
                      <MessageSquare className="w-5 h-5 text-[#666157]" /> Messages
                    </Link>
                    <Link
                      to="/notifications"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-[#1C1B18] hover:bg-[#EAE4DC]"
                    >
                      <Bell className="w-5 h-5 text-[#666157]" /> Notifications 
                      {unreadCount > 0 && <span className="ml-auto bg-[#C48B3F] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{unreadCount}</span>}
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 transition-colors"
                    >
                      <LogOut className="w-5 h-5" /> Sign out
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                      onClick={() => { navigate('/auth'); setIsOpen(false); }}
                      className="w-full justify-center py-2.5 rounded-full border border-[#1C1B18] text-[#1C1B18] font-medium text-sm"
                    >
                      Sign In
                    </button>
                    <button
                      onClick={() => { navigate('/auth?tab=register'); setIsOpen(false); }}
                      className="w-full justify-center py-2.5 rounded-full bg-[#1C1B18] hover:bg-[#C48B3F] text-white font-medium text-sm shadow-xs"
                    >
                      Register
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
