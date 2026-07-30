import { createBrowserRouter } from 'react-router-dom';
import { HomePlaceholder } from '@/app/HomePlaceholder';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <HomePlaceholder />,
  },
]);
