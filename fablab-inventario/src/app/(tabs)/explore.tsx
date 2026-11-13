// Pantalla Inventario: lista de salas con su edificio y cantidad de elementos,
// y el aviso de privacidad. Cada sala abre /sala/[id].
// La tarjeta entera es el botón: antes cada sala repetía un botón rojo "Ver"
// (trece veces el mismo bloque rojo) y el conteo era una línea más de texto.
// Ahora el conteo va en una píldora a la derecha, la fila lleva un chevron y el
// borde se enciende al pasar el mouse o al pulsar.
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, MaxContentWidthEscritorio, Spacing, SombraTarjeta, RojoTexto } from '@/constants/theme';
import { estiloRejilla, useDisposicion } from '@/hooks/use-disposicion';
import { useTheme } from '@/hooks/use-theme';
import { listarSalas, resetCache, type Room } from '@/lib/inventory';

export default function InventoryScreen() {
  const { escritorio, columnas } = useDisposicion();
  const theme = useTheme();
  const [salas, setSalas] = useState<Room[]>([]);
  // Si todas las salas están en el mismo edificio, repetirlo en cada tarjeta solo estorba.
  const variosEdificios = new Set(salas.map((s) => s.edificio)).size > 1;
  // listarSalas devuelve [] tanto si falló la red como si no hay salas; con 11
  // salas cargadas, un resultado vacío tras terminar la carga es un fallo.
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  // Id de la tarjeta bajo el mouse (solo web): el resaltado se hace con estado
  // para no depender del estado `hovered` del Pressable, que no está tipado.
  const [resaltada, setResaltada] = useState<number | null>(null);

  const cargar = useCallback(() => {
    setCargando(true);
    listarSalas().then((lista) => {
      setSalas(lista);
      setCargando(false);
    });
  }, []);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  // Olvida la cache (memoria + AsyncStorage) y vuelve a pedir: el botón de
  // reintento que funciona igual en web y en nativo.
  async function refrescar() {
    if (refrescando) return;
    setRefrescando(true);
    try {
      await resetCache();
      cargar();
    } finally {
      setRefrescando(false);
    }
  }

  // /salas ya trae el conteo de elementos por sala (COUNT en SQL):
  // no hace falta descargar los 916 elementos para contarlos.
  const total = salas.reduce((sum, s) => sum + s.elementos, 0);

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <SafeAreaView style={[styles.content, escritorio && styles.contentEscritorio]}>
          <View style={styles.titleRow}>
            <ThemedText type="title" style={[styles.title, { color: theme.accent }]}>Inventario</ThemedText>
            {salas.length > 0 && (
              <Pressable accessibilityRole="button" disabled={refrescando} onPress={refrescar} hitSlop={8}>
                <ThemedText style={[styles.refreshLabel, { color: theme.accent }]}>
                  {refrescando ? 'Actualizando…' : 'Actualizar'}
                </ThemedText>
              </Pressable>
            )}
          </View>
          <ThemedText themeColor="textSecondary" style={styles.intro}>
            {total === 0
              ? cargando
                ? 'Cargando el inventario…'
                : 'Sin elementos cargados todavía.'
              : `${total} elemento${total === 1 ? '' : 's'} en ${salas.length} sala${salas.length === 1 ? '' : 's'}.`}
          </ThemedText>

          <View style={[styles.roomList, escritorio && styles.roomListEscritorio]}>
            {salas.map((sala) => {
              const count = sala.elementos;
              const activa = resaltada === sala.id;
              return (
                <Pressable
                  key={sala.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Ver ${sala.nombre}: ${count} elemento${count === 1 ? '' : 's'}`}
                  onPress={() => router.push({ pathname: '/sala/[nombre]', params: { nombre: String(sala.id) } })}
                  onHoverIn={() => setResaltada(sala.id)}
                  onHoverOut={() => setResaltada((id) => (id === sala.id ? null : id))}
                  style={({ pressed }) => [
                    styles.roomCard,
                    estiloRejilla(columnas),
                    { backgroundColor: theme.backgroundElement, borderColor: activa || pressed ? theme.accent : theme.backgroundSelected },
                    pressed && styles.roomCardPressed,
                  ]}>
                  <View style={styles.roomHead}>
                    <ThemedText type="subtitle" style={styles.roomTitle} numberOfLines={1}>{sala.nombre}</ThemedText>
                    <View style={[styles.roomCount, { backgroundColor: theme.backgroundSelected }]}>
                      <ThemedText style={[styles.roomCountText, { color: theme.accent }]}>{count}</ThemedText>
                    </View>
                    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                      <Path
                        d="M9 5l7 7-7 7"
                        stroke={theme.textSecondary}
                        strokeWidth={2.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </Svg>
                  </View>
                  {variosEdificios && (
                    <ThemedText themeColor="textSecondary" type="small" numberOfLines={1}>
                      {sala.edificio}
                    </ThemedText>
                  )}
                </Pressable>
              );
            })}
            {/* Mientras carga no se deja la pantalla vacía: se dibujan tarjetas
                sin contenido con la misma medida, para que la lista no salte. */}
            {!salas.length && cargando && Array.from({ length: columnas * 3 }).map((_, i) => (
              <View
                key={`hueco-${i}`}
                style={[styles.roomCard, styles.roomCardHueco, estiloRejilla(columnas), { backgroundColor: theme.backgroundElement }]}
              />
            ))}
            {!salas.length && !cargando && (
              <View style={[styles.errorBox, { backgroundColor: theme.backgroundElement }]}>
                <ThemedText style={[styles.errorText, { color: theme.accent }]}>
                  No se pudieron cargar las salas. Revisa tu conexión.
                </ThemedText>
                <Pressable
                  accessibilityRole="button"
                  onPress={refrescar}
                  style={styles.primaryButton}>
                  <ThemedText style={styles.primaryButtonLabel}>Reintentar</ThemedText>
                </Pressable>
              </View>
            )}
          </View>

          <View style={[styles.privacy, { borderTopColor: theme.backgroundSelected }]}>
            <ThemedText themeColor="textSecondary" type="small" style={styles.privacyText}>
              Aviso de privacidad: este sistema registra elementos del inventario, no datos personales. Si encuentras datos de una persona en una foto o en una observación, contacta al FabLab para corregirlos o eliminarlos.
            </ThemedText>
          </View>
        </SafeAreaView>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, alignItems: 'center' },
  content: { width: '100%', maxWidth: MaxContentWidth, paddingHorizontal: Spacing.four, paddingBottom: BottomTabInset + Spacing.four },
  contentEscritorio: { maxWidth: MaxContentWidthEscritorio },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two, marginTop: Spacing.six },
  title: { color: RojoTexto },
  refreshLabel: { color: RojoTexto, fontWeight: '700', fontSize: 14 },
  intro: { marginTop: Spacing.one, lineHeight: 21 },
  roomList: { gap: Spacing.two + Spacing.one, marginTop: Spacing.five, width: '100%' },
  roomListEscritorio: { flexDirection: 'row', flexWrap: 'wrap' },
  roomCard: { ...SombraTarjeta, minHeight: 72, borderRadius: 16, paddingVertical: Spacing.three, paddingHorizontal: Spacing.four, overflow: 'hidden', gap: Spacing.one, borderWidth: 1, justifyContent: 'center' },
  roomCardPressed: { opacity: 0.88 },
  roomCardHueco: { opacity: 0.5, borderColor: 'transparent' },
  roomHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  roomTitle: { flex: 1, fontSize: 18, lineHeight: 24, letterSpacing: -0.2 },
  roomCount: { minWidth: 34, borderRadius: 999, paddingHorizontal: Spacing.two, paddingVertical: Spacing.half, alignItems: 'center' },
  roomCountText: { fontSize: 13, fontWeight: '700' },
  errorBox: { width: '100%', borderRadius: 12, padding: Spacing.four, gap: Spacing.three, alignItems: 'flex-start' },
  errorText: { color: RojoTexto, lineHeight: 21 },
  primaryButton: { minHeight: 36, borderRadius: 8, backgroundColor: '#C8102E', paddingHorizontal: Spacing.three, alignItems: 'center', justifyContent: 'center' },
  primaryButtonLabel: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  privacy: { marginTop: Spacing.six, paddingTop: Spacing.four, borderTopWidth: 1, width: '100%' },
  privacyText: { lineHeight: 20 },
});
