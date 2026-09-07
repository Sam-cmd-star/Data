export type Cargo = 'Administrador' | 'Analista BI' | 'Integrador' | 'Empleado' | 'Asesor CRM';

export const ADMIN_CARGOS: Cargo[] = ['Administrador', 'Analista BI'];
export const INTEGRADOR_CARGOS: Cargo[] = ['Integrador', 'Empleado', 'Asesor CRM'];

export function homePathForCargo(cargo: Cargo): '/admin' | '/employee' {
  if (ADMIN_CARGOS.includes(cargo)) return '/admin';
  return '/employee';
}

export interface UserProfile {
  id: string;
  email: string;
  nombre: string;
  cargo: Cargo;
}