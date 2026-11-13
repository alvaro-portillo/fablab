// Encuadre de una foto ya guardada: se arrastra (y se acerca) dentro del marco
// 4:3 de la ficha y se guarda el recorte como foto nueva. El original no se
// guarda en el server, así que el recorte sale de la foto de 1200 px.
import { ImageManipulator } from 'expo-image-manipulator';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { RojoTexto, Spacing } from '@/constants/theme';

const ZOOM_MAX = 4;
const PASO = 1.1; // cada − / + o rueda: 10 %
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
  // zoom 1 = la foto llena el marco; por debajo (solo web) se ve entera con relleno blanco.
  const zoomMin = Platform.OS === 'web' && dims && marcoW
    ? Math.min(marcoW / dims.w, marcoH / dims.h) / Math.max(marcoW / dims.w, marcoH / dims.h) : 1;
  const escala = dims && marcoW ? Math.max(marcoW / dims.w, marcoH / dims.h) * zoom : 1;
  const ventana = dims ? { w: marcoW / escala, h: marcoH / escala } : { w: 0, h: 0 };
  const acotar = (p: { x: number; y: number }) => dims
    ? { x: clamp(p.x, Math.min(0, dims.w - ventana.w), Math.max(0, dims.w - ventana.w)),
        y: clamp(p.y, Math.min(0, dims.h - ventana.h), Math.max(0, dims.h - ventana.h)) }
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
  const puedeMoverse = !!dims && (Math.abs(ventana.w - dims.w) > 1 || Math.abs(ventana.h - dims.h) > 1);

  function cambiarZoom(z: number) {
    z = clamp(z, zoomMin, ZOOM_MAX);
    centro.current = { x: pos.x + ventana.w / 2, y: pos.y + ventana.h / 2 };
    setZoom(z);
  }

  // Rueda del mouse: listener nativo no pasivo, para que no desplace el modal mientras se hace zoom.
  const marcoRef = useRef<View>(null);
  const rueda = useRef((_: WheelEvent) => {});
  useEffect(() => {
    rueda.current = (e) => { e.preventDefault(); cambiarZoom(zoom * (e.deltaY < 0 ? PASO : 1 / PASO)); };
  });
  useEffect(() => {
    const el = marcoRef.current as unknown as HTMLElement | null;
    if (Platform.OS !== 'web' || !el?.addEventListener) return;
    const f = (e: WheelEvent) => rueda.current(e);
    el.addEventListener('wheel', f, { passive: false });
    return () => el.removeEventListener('wheel', f);
  }, []);

  async function guardar() {
    if (!src || !dims) return;
    setRecortando(true);
    try {
      if (Platform.OS === 'web') {
        // Canvas: permite ventana más grande que la foto (alejar) rellenando de blanco.
        const img = new window.Image();
        img.src = src;
        await img.decode();
        const c = document.createElement('canvas');
        c.width = Math.round(ventana.w); c.height = Math.round(ventana.h);
        const ctx = c.getContext('2d')!;
        ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, -pos.x, -pos.y);
        const blob = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/jpeg', 0.92));
        if (!blob) throw new Error('toBlob');
        onGuardar({ uri: URL.createObjectURL(blob), ancho: c.width, alto: c.height });
        return;
      }
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
        onPointerCancel={() => setArrastre(null)}
        ref={marcoRef}>
        {src && dims ? (
          <Image
            source={{ uri: src }}
            style={{ position: 'absolute', left: -pos.x * escala, top: -pos.y * escala, width: dims.w * escala, height: dims.h * escala }}
          />
        ) : !error && <ActivityIndicator style={styles.cargando} />}
      </View>
      <ThemedText themeColor="textSecondary" type="small">
        {puedeMoverse ? 'Arrastra la foto para centrarla. Zoom (también con la rueda del mouse):' : 'Acerca o aleja la foto para poder moverla.'}
      </ThemedText>
      <View style={styles.fila}>
        <Pressable accessibilityRole="button" accessibilityLabel="Alejar" disabled={zoom <= zoomMin + 1e-3}
          onPress={() => cambiarZoom(zoom / PASO)} style={[styles.boton, zoom <= zoomMin + 1e-3 && { opacity: 0.4 }]}>
          <ThemedText style={styles.etiqueta}>  −  </ThemedText>
        </Pressable>
        <ThemedText style={[styles.etiqueta, styles.porcentaje]}>{Math.round(zoom * 100)} %</ThemedText>
        <Pressable accessibilityRole="button" accessibilityLabel="Acercar" disabled={zoom >= ZOOM_MAX - 1e-3}
          onPress={() => cambiarZoom(zoom * PASO)} style={[styles.boton, zoom >= ZOOM_MAX - 1e-3 && { opacity: 0.4 }]}>
          <ThemedText style={styles.etiqueta}>  +  </ThemedText>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => cambiarZoom(1)} style={styles.boton}>
          <ThemedText style={styles.etiqueta}>Llenar</ThemedText>
        </Pressable>
        {zoomMin < 1 && (
          <Pressable accessibilityRole="button" onPress={() => cambiarZoom(zoomMin)} style={styles.boton}>
            <ThemedText style={styles.etiqueta}>Entera</ThemedText>
          </Pressable>
        )}
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
  marco: { width: '100%', aspectRatio: 4 / 3, borderRadius: 12, overflow: 'hidden', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#0002', cursor: 'grab' as never, touchAction: 'none' as never, userSelect: 'none' as never },
  cargando: { flex: 1 },
  fila: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
  boton: { minHeight: 36, borderRadius: 18, borderWidth: 1, borderColor: RojoTexto, paddingHorizontal: Spacing.two, alignItems: 'center', justifyContent: 'center' },
  botonActivo: { backgroundColor: RojoTexto },
  etiqueta: { color: RojoTexto, fontSize: 13, fontWeight: '700' },
  porcentaje: { minWidth: 56, textAlign: 'center', alignSelf: 'center' },
  etiquetaActiva: { color: '#FFFFFF' },
});
