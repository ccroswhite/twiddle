import { Outlet, NavLink } from 'react-router-dom';
import { Workflow, Key, Settings, LogOut, User, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

const navItems = [
  { to: '/workflows', icon: Workflow, label: 'Workflows' },
  { to: '/credentials', icon: Key, label: 'Credentials' },
  { to: '/groups', icon: Users, label: 'Groups' },
];

export function Layout() {
  const { authenticated, user, logout } = useAuth();

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col">
        {/* Logo */}
        <div className="p-4 border-b border-slate-700">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
              <Workflow className="w-5 h-5" />
            </div>
            Twiddle
          </h1>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                      isActive
                        ? 'bg-primary-600 text-white'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white',
                    )
                  }
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 space-y-2">
          {/* User info */}
          {authenticated && user && (
            <div className="flex items-center gap-3 px-3 py-2 text-slate-300">
              <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{user.name || user.email.split('@')[0]}</div>
                <div className="text-xs text-slate-400 truncate">{user.email}</div>
              </div>
            </div>
          )}

          <NavLink
            to="/settings"
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2 w-full rounded-lg transition-colors',
                isActive
                  ? 'bg-primary-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white',
              )
            }
          >
            <Settings className="w-5 h-5" />
            Settings
          </NavLink>

          {/* Logout button */}
          {authenticated && (
            <button
              onClick={logout}
              className="flex items-center gap-3 px-3 py-2 w-full text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-slate-50">
        <Outlet />
      </main>
    </div>
  );
}
