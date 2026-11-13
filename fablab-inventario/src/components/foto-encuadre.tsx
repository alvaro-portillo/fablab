// Encuadre de una foto ya guardada: se arrastra (y se acerca) dentro del marco
// 4:3 de la ficha y se guarda el recorte como foto nueva. El original no se
// guarda en el server, así que el recorte sale de la foto de 1200 px.
import { ImageManipulator } from 'expo-image-manipulator';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { RojoTexto, Spacing } from '@/constants/theme';

const ZOOMS = [1, 1.5, 2, 3];
const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

export type Recorte = { uri: string; ancho: number; alto: number };

export function FotoEncuadre({ uri, onCancelar, onGuardar }: {
  uri: string;
  onCancelar: () => void;
  onGuardar: (r: Recorte) => void;
}) {
  // En web la foto viene de otro dominio: como blob local el canvas del recorte no queda "tainted".
  const [src, setSrc] = useState<string | null>(Platform.OS === 'web' ? null : uri);
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
  const [marcoW, setMarcoW] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 }); // esquina sup. izq. de la ventana, en px de la imagen
  const [error, setError] = useState<string | null>(null);
  const [recortando, setRecortando] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    let url: string | null = null;
    fetch(uri).then((r) => r.blob()).then((b) => { url = URL.createObjectURL(b); setSrc(url); })
      .catch(() => setError('No se pudo cargar la foto.'));
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [uri]);

  useEffect(() => {
    if (src) Image.getSize(src, (w, h) => setDims({ w, h }), () => setError('No se pudo leer la foto.'));
  }, [src]);

  const marcoH = (marcoW * 3) / 4;
  const escala = dims && marcoW ? Math.max(marcoW / dims.w, marcoH / dims.h) * zoom : 1;
  const ventana = dims ? { w: marcoW / escala, h: marcoH / escala } : { w: 0, h: 0 };
  const acotar = (p: { x: number; y: number }) => dims
    ? { x: clamp(p.x, 0, dims.w - ventana.w), y: clamp(p.y, 0, dims.h - ventana.h) }
    : p;

  // Al cargar o cambiar el zoom se conserva el centro de lo que se ve.
  const centro = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => {
    if (!dims || !marcoW) return;
    const c = centro.current ?? { x: dims.w / 2, y: dims.h / 2 };
    setPos(acotar({ x: c.x - ventana.w / 2, y: c.y - ventana.h / 2 }));
  }, [dims, marcoW, zoom]); // eslint-disable-line react-hooks/exhaustive-deps

  // Punteros (mouse, dedo, lápiz) en vez de PanResponder: en web el arrastre con mouse no llegaba.
  const [arrastre, setArrastre] = useState<{ px: number; py: number; x: number; y: number } | null>(null);
  const puedeMoverse = !!dims && (ventana.w < dims.w - 1 || ventana.h < dims.h - 1);

  function cambiarZoom(z: number) {
    centro.current = { x: pos.x + ventana.w / 2, y: pos.y + ventana.h / 2 };
    setZoom(z);
  }

  async function guardar() {
    if (!src || !dims) return;
    setRecortando(true);
    try {
      const ref = await ImageManipulator.manipulate(src).crop({
        originX: Math.round(pos.x), originY: Math.round(pos.y),
        width: Math.round(ventana.w), height: Math.round(ventana.h),
      }).renderAsync();
      const res = await ref.saveAsync({ compress: 1 });
      onGuardar({ uri: res.uri, ancho: res.width, alto: res.height });
    } catch {
      setError('No se pudo recortar la foto.');
      setRecortando(false);
    }
  }

  return (
    <View style={styles.caja}>
      <View
        style={styles.marco}
        onLayout={(e) => setMarcoW(e.nativeEvent.layout.width)}
        onPointerDown={(e) => {
          const t = e.currentTarget as unknown as { setPointerCapture?: (id: number) => void };
          t.setPointerCapture?.(e.nativeEvent.pointerId);
          setArrastre({ px: e.nativeEvent.pageX, py: e.nativeEvent.pageY, x: pos.x, y: pos.y });
        }}
        onPointerMove={(e) => {
          if (!arrastre) return;
          setPos(acotar({
            x: arrastre.x - (e.nativeEvent.pageX - arrastre.px) / escala,
            y: arrastre.y - (e.nativeEvent.pageY - arrastre.py) / escala,
          }));
        }}
        onPointerUp={() => setArrastre(null)}
        onPointerCancel={() => setArrastre(null)}>
        {src && dims ? (
          <Image
            source={{ uri: src }}
            style={{ position: 'absolute', left: -pos.x * escala, top: -pos.y * escala, width: dims.w * escala, height: dims.h * escala }}
          />
        ) : !error && <ActivityIndicator style={styles.cargando} />}
      </View>
      <ThemedText themeColor="textSecondary" type="small">
        {puedeMoverse ? 'Arrastra la foto para centrarla. Acercar:' : 'La foto ya llena el marco: acércala para poder moverla.'}
      </ThemedText>
      <View style={styles.fila}>
        {ZOOMS.map((z) => (
          <Pressable key={z} accessibilityRole="button" onPress={() => cambiarZoom(z)}
            style={[styles.boton, zoom === z && styles.botonActivo]}>
            <ThemedText style={[styles.etiqueta, zoom === z && styles.etiquetaActiva]}>{z}×</ThemedText>
          </Pressable>
        ))}
      </View>
      {error && <ThemedText style={{ color: RojoTexto }} type="small">{error}</ThemedText>}
      <View style={styles.fila}>
        <Pressable accessibilityRole="button" disabled={!dims || recortando} onPress={guardar}
          style={[styles.boton, styles.botonActivo, (!dims || recortando) && { opacity: 0.5 }]}>
          <ThemedText style={[styles.etiqueta, styles.etiquetaActiva]}>Guardar encuadre</ThemedText>
        </Pressable>
        <Pressable accessibilityRole="button" disabled={recortando} onPress={onCancelar} style={styles.boton}>
          <ThemedText style={styles.etiqueta}>Cancelar</ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  caja: { gap: Spacing.one },
  marco: { width: '100%', aspectRatio: 4 / 3, borderRadius: 12, overflow: 'hidden', backgroundColor: '#0002', cursor: 'grab' as never, touchAction: 'none' as never, userSelect: 'none' as never },
  cargando: { flex: 1 },
  fila: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
  boton: { minHeight: 36, borderRadius: 18, borderWidth: 1, borderColor: RojoTexto, paddingHorizontal: Spacing.two, alignItems: 'center', justifyContent: 'center' },
  botonActivo: { backgroundColor: RojoTexto },
  etiqueta: { color: RojoTexto, fontSize: 13, fontWeight: '700' },
  etiquetaActiva: { color: '#FFFFFF' },
});
