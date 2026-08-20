import * as React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Role } from '../types/auth.types';

interface RoleGateProps {
  children: React.ReactNode;
  allowedRoles: Role[];
}

export function RoleGate({ children, allowedRoles }: RoleGateProps) {
  const user = useAuthStore((state) => state.user);

  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/403" replace />;
  }

  return <>{children}</>;
}
