import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { queryClient } from '@/api/query-client';
import { AppRouter } from '@/router/app-router';
import { Toaster } from '@/shared/components/ui/toast';
import { TooltipProvider } from '@/shared/components/ui/tooltip';

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster>
        <BrowserRouter>
          <TooltipProvider>
            <AppRouter />
          </TooltipProvider>
        </BrowserRouter>
      </Toaster>
    </QueryClientProvider>
  );
}
