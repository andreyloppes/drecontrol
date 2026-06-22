import { createContext, useContext, ReactNode } from 'react';
import { useFinance } from '@/hooks/useFinance';

type FinanceContextType = ReturnType<typeof useFinance>;

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider = ({ children }: { children: ReactNode }) => {
  const finance = useFinance();
  return (
    <FinanceContext.Provider value={finance}>
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinanceContext = () => {
  const context = useContext(FinanceContext);
  if (context === undefined) {
    throw new Error('useFinanceContext must be used within a FinanceProvider');
  }
  return context;
};
