import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, PlusCircle, FileText, TrendingUp } from 'lucide-react';

export const BottomNav = () => {
  const { t } = useTranslation();

  const navItems = [
    { to: '/', label: t('nav.home'), icon: Home },
    { to: '/expenses/add', label: t('nav.add'), icon: PlusCircle, isHighlight: true },
    { to: '/reports', label: t('nav.reports'), icon: FileText },
    { to: '/prices', label: t('nav.prices'), icon: TrendingUp },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-[#ffffff] border-t border-[#eee8dc] shadow-lg pb-safe">
      <div className="max-w-xl mx-auto flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center flex-1 min-h-[48px] py-1 transition-colors relative ${
                  isActive
                    ? 'text-agri-800 font-bold'
                    : 'text-earth-600 hover:text-earth-900 font-medium'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {item.isHighlight ? (
                    <div className="flex flex-col items-center -mt-4">
                      <div className="w-12 h-12 rounded-full bg-agri-800 text-cream-50 flex items-center justify-center shadow-md border-2 border-white hover:bg-agri-900 active:scale-95 transition-all">
                        <Icon className="w-7 h-7 text-cream-50" />
                      </div>
                      <span className="text-[11px] font-bold mt-0.5 text-agri-900">
                        {item.label}
                      </span>
                    </div>
                  ) : (
                    <>
                      <Icon className={`w-6 h-6 transition-transform ${isActive ? 'scale-110 text-agri-800' : ''}`} />
                      <span className="text-[11px] mt-0.5 tracking-tight">
                        {item.label}
                      </span>
                      {isActive && (
                        <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-agri-700"></span>
                      )}
                    </>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
