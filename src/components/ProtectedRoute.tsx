import { Navigate } from 'react-router-dom';
import { ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const userName = localStorage.getItem('user_name');

  if (!userName) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
