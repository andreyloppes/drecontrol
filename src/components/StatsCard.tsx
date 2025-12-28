import { ReactNode } from 'react';

interface StatsCardProps {
  title: string;
  value: number;
  icon: ReactNode;
  variant?: 'default' | 'highlight';
}

export function StatsCard({ title, value, icon, variant = 'default', description }: StatsCardProps & { description?: string }) {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val);
  };

  return (
    <div
      className={`border-2 border-foreground p-6 shadow-sm hover:shadow-md transition-shadow ${variant === 'highlight' ? 'bg-foreground text-background' : 'bg-background'
        }`}
    >
      <div className="flex items-center justify-between mb-4">
        <span className={`text-sm font-medium uppercase tracking-wide ${variant === 'highlight' ? 'text-background/70' : 'text-muted-foreground'
          }`}>
          {title}
        </span>
        <div className={variant === 'highlight' ? 'text-background' : 'text-foreground'}>
          {icon}
        </div>
      </div>
      <p className={`text-3xl font-bold font-mono ${variant === 'highlight' ? 'text-background' : 'text-foreground'
        }`}>
        {formatCurrency(value)}
      </p>
      {description && (
        <p className={`text-xs mt-2 ${variant === 'highlight' ? 'text-background/70' : 'text-muted-foreground'
          }`}>
          {description}
        </p>
      )}
    </div>
  );
}
