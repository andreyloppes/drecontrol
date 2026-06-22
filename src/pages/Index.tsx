import { FinanceProvider } from '@/context/FinanceContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { MobileLayout } from '@/components/layouts/MobileLayout';
import { DesktopLayout } from '@/components/layouts/DesktopLayout';

/**
 * Roteador fino. O Provider engloba o hook pesado (Supabase calls) para que
 * só a página /dashboard dispare a busca. Os layouts consomem via contexto.
 */
const Index = () => {
  const isMobile = useIsMobile();

  return (
    <FinanceProvider>
      {isMobile ? <MobileLayout /> : <DesktopLayout />}
    </FinanceProvider>
  );
};

export default Index;
