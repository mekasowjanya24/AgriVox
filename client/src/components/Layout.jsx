import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Header } from './Header.jsx';
import { BottomNav } from './BottomNav.jsx';
import { LayoutDashboard, MapPin, Sprout } from 'lucide-react';

export const Layout = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col bg-[#fcfbf7] text-earth-900 pb-20">
      <Header />

      {/* Sub-navigation bar for Dashboard, Plots, Cycles */}
      <div className="bg-[#f7f4ed] border-b border-[#eee8dc] px-4 py-2 sticky top-[61px] z-20">
        <div className="max-w-xl mx-auto flex items-center justify-around gap-2 text-sm font-semibold">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                isActive
                  ? 'bg-agri-800 text-white shadow-xs'
                  : 'text-earth-700 hover:bg-cream-200'
              }`
            }
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>{t('nav.home')}</span>
          </NavLink>

          <NavLink
            to="/plots"
            className={({ isActive }) =>
              `flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                isActive
                  ? 'bg-agri-800 text-white shadow-xs'
                  : 'text-earth-700 hover:bg-cream-200'
              }`
            }
          >
            <MapPin className="w-4 h-4" />
            <span>{t('nav.plots')}</span>
          </NavLink>

          <NavLink
            to="/cycles"
            className={({ isActive }) =>
              `flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                isActive
                  ? 'bg-agri-800 text-white shadow-xs'
                  : 'text-earth-700 hover:bg-cream-200'
              }`
            }
          >
            <Sprout className="w-4 h-4" />
            <span>{t('nav.cycles')}</span>
          </NavLink>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-xl w-full mx-auto px-4 py-4">
        <Outlet />
      </main>

      <BottomNav />
    </div>
  );
};
