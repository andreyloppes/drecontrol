import { Home, Receipt, BarChart3, Sparkles } from 'lucide-react';

export type MobileTab = 'home' | 'transactions' | 'dfc' | 'ai';

interface MobileBottomNavProps {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
}

const TABS = [
  { id: 'home' as MobileTab, icon: Home, label: 'Início' },
  { id: 'transactions' as MobileTab, icon: Receipt, label: 'Extrato' },
  { id: 'dfc' as MobileTab, icon: BarChart3, label: 'Fluxo' },
  { id: 'ai' as MobileTab, icon: Sparkles, label: 'IA' },
];

export function MobileBottomNav({ activeTab, onTabChange }: MobileBottomNavProps) {
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-white/10 backdrop-blur-xl"
    >
      <div className="flex justify-around items-center py-1 pb-[max(0.25rem,env(safe-area-inset-bottom))]">
        {TABS.map(({ id, icon: Icon, label }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onTabChange(id)}
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 min-h-[56px] min-w-[44px] px-2 py-2 rounded-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${
                isActive ? 'text-cyan-400' : 'text-muted-foreground'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'scale-110' : ''} transition-transform`} aria-hidden="true" />
              <span className="text-[11px] tracking-wide font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
