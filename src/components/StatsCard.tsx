import { ReactNode } from 'react';
import { formatCurrency } from '@/lib/format';

interface StatsCardProps {
  title: string;
  value: number;
  icon: ReactNode;
  variant?: 'default' | 'highlight';
}

export function StatsCard({ title, value, icon, variant = 'default', description }: StatsCardProps & { description?: string }) {

  return (
    <div
      className={`relative overflow-hidden p-6 glass rounded-3xl transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 group ${variant === 'highlight' ? 'border-cyan-500/50 shadow-neon' : 'hover:border-white/20'
        }`}
    >
      {/* Accent Background */}
      {variant === 'highlight' && (
        <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/20 blur-3xl -mr-8 -mt-8 rounded-full" />
      )}

      <div className="flex items-center justify-between mb-4 relative z-10">
        <span className="text-[10px] md:text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground group-hover:text-foreground/90 transition-colors">
          {title}
        </span>
        <div className={`transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12 ${variant === 'highlight' ? 'text-cyan-400' : 'text-foreground/70'
          }`}>
          {icon}
        </div>
      </div>

      <p className={`text-2xl md:text-3xl font-bold tracking-tight relative z-10 ${variant === 'highlight' ? 'text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400' : ''
        }`}>
        {formatCurrency(value)}
      </p>

      {description && (
        <p className="text-[10px] md:text-xs mt-3 text-muted-foreground font-mono uppercase opacity-70 group-hover:opacity-100 transition-opacity">
          {description}
        </p>
      )}
    </div>
  );
}
