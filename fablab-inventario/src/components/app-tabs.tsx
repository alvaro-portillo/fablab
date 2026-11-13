// Barra de pestañas en nativo (iOS/Android).
import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { useTheme } from '@/hooks/use-theme';

export default function AppTabs() {
  const theme = useTheme();

  return (
    <NativeTabs
      backgroundColor={theme.background}
      indicatorColor={theme.backgroundElement}
      iconColor={theme.accent}
      labelStyle={{ default: { color: theme.text }, selected: { color: theme.accent } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Inicio</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/home.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="explore">
        <NativeTabs.Trigger.Label>Inventario</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="shippingbox.fill" md="inventory_2" selectedColor={theme.accent} />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

// En nativo las pestañas ya quedan a la vista bajo las pantallas apiladas.
export function BarraPestanas(_: { activa?: 'home' | 'explore' }) {
  return null;
}
