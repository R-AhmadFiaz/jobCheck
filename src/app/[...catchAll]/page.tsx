import { redirect } from 'next/navigation';

// Matches the original router's { path: '*', element: <Navigate to="/" replace /> }.
export default function CatchAllPage() {
  redirect('/');
}
