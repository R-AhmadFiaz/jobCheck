import { RouterProvider } from 'react-router-dom';
import { AppProviders } from '@/app/providers/AppProviders';
import { router } from '@/app/router';
import { ToastContainer } from '@/components/ui';

export function App() {
  return (
    <AppProviders>
      <RouterProvider router={router} />
      <ToastContainer />
    </AppProviders>
  );
}
