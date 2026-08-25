import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, Check, Layers, Plus, Server, Globe } from 'lucide-react';
import { platformApi } from '../../services/platform.api';
import type { ApplicationSummary } from '../../services/platform.api';

export const ApplicationSwitcher: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { id: currentAppId } = useParams<{ id: string }>();

  const { data: applications } = useQuery<ApplicationSummary[]>({
    queryKey: ['platform-applications'],
    queryFn: platformApi.getApplications,
  });

  const activeApp = applications?.find((a) => a.id === currentAppId);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectApp = (appId: string) => {
    setIsOpen(false);
    navigate(`/platform/applications/${appId}`);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-slate-600 text-slate-200 transition-all text-xs font-semibold shadow-sm"
      >
        <div className="w-5 h-5 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center shrink-0">
          <Layers className="w-3 h-3" />
        </div>
        <span className="max-w-[140px] sm:max-w-[180px] truncate font-medium">
          {activeApp ? activeApp.name : 'Switch Application'}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-72 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden py-1 backdrop-blur-xl animate-in fade-in-50 zoom-in-95 duration-150">
          <div className="px-3 py-2 border-b border-slate-800/80 flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            <span>My Applications ({applications?.length || 0})</span>
            <button
              onClick={() => {
                setIsOpen(false);
                navigate('/platform/create-app');
              }}
              className="text-orange-400 hover:text-orange-300 flex items-center space-x-1"
            >
              <Plus className="w-3 h-3" />
              <span>New</span>
            </button>
          </div>

          <div className="max-h-64 overflow-y-auto divide-y divide-slate-800/40">
            {!applications || applications.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500">
                <Server className="w-6 h-6 mx-auto mb-1.5 text-slate-600" />
                No applications deployed yet.
              </div>
            ) : (
              applications.map((app) => {
                const isSelected = app.id === currentAppId;
                return (
                  <button
                    key={app.id}
                    onClick={() => handleSelectApp(app.id)}
                    className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between transition-colors ${
                      isSelected ? 'bg-orange-500/10 text-orange-300' : 'hover:bg-slate-800/60 text-slate-300'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <div className="flex items-center space-x-1.5">
                        <span className="font-semibold text-xs text-slate-200 truncate">{app.name}</span>
                        {app.status === 'active' ? (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center space-x-1 text-[10px] text-slate-500 mt-0.5">
                        <Globe className="w-2.5 h-2.5 shrink-0" />
                        <span className="truncate">{app.defaultDomain}</span>
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-orange-400 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>

          <div className="p-2 border-t border-slate-800/80 bg-slate-950/40">
            <button
              onClick={() => {
                setIsOpen(false);
                navigate('/platform/applications');
              }}
              className="w-full text-center py-1.5 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
            >
              View All Applications →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
