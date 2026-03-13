import { useEffect, useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Activity, FileText, Pill, MessageSquare, User, LayoutDashboard, LogOut, CalendarHeart, ArrowUpToLine, ArrowUp, ArrowDown, ActivitySquare, Users } from 'lucide-react';
import clsx from 'clsx';

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [profileName, setProfileName] = useState<string>('');

  useEffect(() => {
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.scrollIntoView({ behavior: 'smooth' });
    }

    // Fetch profile to get the full name
    fetch('/api/data/Profile')
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        if (data && data.length > 0) {
          const latestProfile = data[data.length - 1];
          if (latestProfile.Name) {
            setProfileName(latestProfile.Name);
          }
        }
      })
      .catch(err => console.error('Failed to fetch profile name:', err));
  }, [location.pathname]);

  useEffect(() => {
    // Initialize required sheets on app load
    fetch('/api/init-sheets', { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        if (data.created && data.created.length > 0) {
          console.log('Created missing sheets:', data.created);
        }
      })
      .catch(err => console.error('Failed to initialize sheets:', err));
  }, []);

  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/vitals', label: 'Vitals', icon: Activity },
    { path: '/lab-results', label: 'Lab Results', icon: FileText },
    { path: '/medications', label: 'Medications', icon: Pill },
    { path: '/activities', label: 'Activities', icon: ActivitySquare },
    { path: '/family-history', label: 'Family History', icon: Users },
    { path: '/events', label: 'Health Events', icon: CalendarHeart },
    { path: '/chat', label: 'AI Assistant', icon: MessageSquare },
    { path: '/profile', label: 'Profile', icon: User },
  ];

  const scrollToTop = () => {
    const topHeader = document.getElementById('top-header');
    if (topHeader) {
      topHeader.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const scrollToMainContent = () => {
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const scrollToBottom = () => {
    const chatBottom = document.getElementById('chat-bottom');
    if (chatBottom) {
      chatBottom.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Header */}
      <header id="top-header" className="bg-white border-b border-slate-200">
        <div className="px-4 md:px-6 h-16 flex items-center justify-between">
          <div className="items-center">
            <h1 className="text-lg md:text-xl font-bold text-slate-800">Health Tracker & Lab Analyzer</h1>
            <div className="lg:block text-sm text-green-600">{profileName || user?.name || 'Loading...'}</div>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <div className="hidden sm:flex items-center gap-3 mr-2">
              <div className="text-right">
                <p className="text-sm font-medium text-slate-900 truncate max-w-[120px] md:max-w-[200px]">{user?.name}</p>
                <p className="text-xs text-slate-500 truncate max-w-[120px] md:max-w-[200px]">{user?.email}</p>
              </div>
              <img src={user?.picture} alt={user?.name} className="w-8 h-8 rounded-full border border-slate-200" referrerPolicy="no-referrer" />
            </div>
            
            {/* Mobile user image only */}
            <div className="sm:hidden">
              <img src={user?.picture} alt={user?.name} className="w-8 h-8 rounded-full border border-slate-200" referrerPolicy="no-referrer" />
            </div>

            <button
              onClick={logout}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden md:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col md:flex-row">
        {/* Sidebar */}
        <aside className="w-full md:w-64 bg-white border-r border-slate-200 flex flex-col">
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={clsx(
                    'flex items-center gap-3 px-4 py-3 rounded-xl transition-colors',
                    isActive 
                      ? 'bg-indigo-50 text-indigo-600 font-medium' 
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  )}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main id="main-content" className="flex-1">
          <div className="p-6 md:p-8 max-w-5xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Floating Shortcut Buttons */}
      <div className={clsx(
        "fixed right-6 md:right-8 flex flex-col gap-3 z-50 transition-all duration-300 bottom-32 md:bottom-36"
      )}>
        <button
          onClick={scrollToTop}
          className="p-3 bg-white text-slate-700 rounded-full shadow-lg hover:bg-slate-50 border border-slate-200 transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
          title="Scroll to very top (Header)"
        >
          <ArrowUpToLine className="w-5 h-5" />
        </button>
        <button
          onClick={scrollToMainContent}
          className="p-3 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          title="Scroll to content top"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
        {location.pathname === '/chat' && (
          <button
            onClick={scrollToBottom}
            className="p-3 bg-emerald-600 text-white rounded-full shadow-lg hover:bg-emerald-700 transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
            title="Scroll to latest message"
          >
            <ArrowDown className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}
