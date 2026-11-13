// Barra de pestañas en web: misma navegación que en nativo, con estilos propios.
import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import { Link } from 'expo-router';
import { Pressable, View, StyleSheet } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { MaxContentWidth, MaxContentWidthEscritorio, Spacing } from '@/constants/theme';
import { useDisposicion } from '@/hooks/use-disposicion';

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="home" href="/" asChild>
            <TabButton>Inicio</TabButton>
          </TabTrigger>
          <TabTrigger name="explore" href="/explore" asChild>
            <TabButton>Inventario</TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

/**
 * La misma barra para las pantallas fuera de las pestañas (sala, administración):
 * Ricardo pidió que nunca se pierda. En nativo no hace falta (app-tabs.tsx → null).
 */
export function BarraPestanas({ activa }: { activa?: 'home' | 'explore' }) {
  return (
    <CustomTabList style={styles.barraFija}>
      <Link href="/" asChild>
        <TabButton isFocused={activa === 'home'}>Inicio</TabButton>
      </Link>
      <Link href="/explore" asChild>
        <TabButton isFocused={activa === 'explore'}>Inventario</TabButton>
      </Link>
    </CustomTabList>
  );
}

export function TabButton({ children, isFocused, ...props }: TabTriggerSlotProps) {
  return (
    <Pressable {...props} style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView
        type={isFocused ? 'backgroundSelected' : 'backgroundElement'}
        style={styles.tabButtonView}>
        <ThemedText type="small" themeColor={isFocused ? 'text' : 'textSecondary'}>
          {children}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  const { escritorio } = useDisposicion();
  return (
    <ThemedView {...props} style={[styles.tabListContainer, props.style]}>
      <ThemedView type="backgroundElement" style={[styles.innerContainer, escritorio && styles.innerContainerEscritorio]}>
        <ThemedText type="smallBold" style={styles.brandText}>
          FabLab UFPS
        </ThemedText>

        {props.children}
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  tabListContainer: {
    position: 'absolute',
    width: '100%',
    padding: Spacing.three,
    zIndex: 10,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  innerContainer: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.five,
    borderRadius: Spacing.five,
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 1,
    gap: Spacing.two,
    maxWidth: MaxContentWidth,
  },
  innerContainerEscritorio: { maxWidth: MaxContentWidthEscritorio },
  brandText: {
    marginRight: 'auto',
  },
  barraFija: { top: 0 },
  pressed: {
    opacity: 0.7,
  },
  tabButtonView: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
});
