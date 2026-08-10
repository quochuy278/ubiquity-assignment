import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { queryClient } from '@/api/query-client';
import { AppRouter } from '@/router/app-router';
import { TooltipProvider } from '@/shared/components/ui/tooltip';

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <TooltipProvider>
          <AppRouter />
        </TooltipProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
