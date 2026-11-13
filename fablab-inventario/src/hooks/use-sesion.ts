// Estado de la sesión de la cuenta del laboratorio para los componentes: si ya se
// sabe (`cargada`) y quién es (`usuario`, o null si no hay sesión vigente).

import { useSyncExternalStore } from 'react';

import { estadoSesion, puede, suscribirSesion } from '@/lib/sesion';

// `puede` lee la sesión al vuelo; el hook re-renderiza cuando cambian usuario o permisos.
export function useSesion(): { cargada: boolean; usuario: string | null; puede: typeof puede } {
  const estado = useSyncExternalStore(suscribirSesion, estadoSesion, estadoSesion);
  const [cargada, , ...resto] = estado.split(':');
  return { cargada: cargada === '1', usuario: resto.join(':') || null, puede };
}
