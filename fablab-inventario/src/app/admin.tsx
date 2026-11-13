// Administración de cuentas: roles (con los permisos que el administrador elija)
// y usuarios. Solo con permiso `administrar`; el server lo exige igual.
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BarraPestanas } from '@/components/app-tabs';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing, SombraTarjeta } from '@/constants/theme';
import { useSesion } from '@/hooks/use-sesion';
import { useTheme } from '@/hooks/use-theme';
import {
  borrarRol, borrarUsuario, guardarRol, guardarUsuario, listarRoles, listarUsuarios,
  type Rol, type Usuario,
} from '@/lib/inventory';
import { mensajeDeError } from '@/lib/mensajes';

const NOMBRE_PERMISO: Record<string, string> = {
  editar: 'Editar todo',
  editar_cantidad: 'Editar cantidades',
  agregar: 'Agregar',
  eliminar: 'Eliminar',
  trasladar: 'Mover de sala',
  fotos: 'Fotos',
  importar: 'Importar',
  administrar: 'Administrar usuarios',
};

export default function Admin() {
  const theme = useTheme();
  const { puede } = useSesion();
  const [roles, setRoles] = useState<Rol[]>([]);
  const [permisos, setPermisos] = useState<string[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [nuevoRol, setNuevoRol] = useState('');
  const [nuevo, setNuevo] = useState({ usuario: '', clave: '', rol_id: 0 });
  const [claves, setClaves] = useState<Record<number, string>>({});
  const [aviso, setAviso] = useState<string | null>(null);
  // Borrar pide un segundo toque: la clave guarda qué se está confirmando.
  const [confirmar, setConfirmar] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      const [r, u] = await Promise.all([listarRoles(), listarUsuarios()]);
      setRoles(r.roles);
      setPermisos(r.permisos);
      setUsuarios(u);
      setError(null);
    } catch (e) {
      setError(mensajeDeError(e, 'No se pudo cargar'));
    }
  }, []);
  useEffect(() => { void Promise.resolve().then(cargar); }, [cargar]);

  // Toda acción: llama, recarga, muestra el error del server si lo hay.
  const hacer = (fn: () => Promise<unknown>, ok = 'Guardado') => async () => {
    setConfirmar(null);
    try { await fn(); await cargar(); setAviso(ok); setTimeout(() => setAviso(null), 2500); }
    catch (e) { setAviso(null); setError(mensajeDeError(e, 'No se pudo guardar')); }
  };
  const borrar = (clave: string, fn: () => Promise<unknown>) =>
    confirmar === clave ? hacer(fn, 'Borrado')() : setConfirmar(clave);
  const BotonBorrar = ({ clave, fn }: { clave: string; fn: () => Promise<unknown> }) => (
    <Pressable accessibilityRole="button" onPress={() => borrar(clave, fn)} style={styles.borrar}>
      <ThemedText type="small" style={{ color: confirmar === clave ? theme.accent : theme.textSecondary, fontWeight: confirmar === clave ? '700' : '400' }}>
        {confirmar === clave ? '¿Seguro? Toca de nuevo' : 'Borrar'}
      </ThemedText>
    </Pressable>
  );

  const input = [styles.input, { color: theme.text, borderColor: theme.backgroundSelected }];
  const chip = (activo: boolean) => [styles.chip, { borderColor: theme.accent }, activo && { backgroundColor: theme.accent }];
  const chipTexto = (activo: boolean) => ({ color: activo ? '#FFFFFF' : theme.accent });
  const marca = (activo: boolean) => (activo ? '✓ ' : '');

  if (!puede('administrar')) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.content}><ThemedText>Tu rol no puede administrar usuarios.</ThemedText></SafeAreaView>
        <BarraPestanas />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <SafeAreaView style={styles.content}>
          <Pressable accessibilityRole="button" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} style={styles.volver}>
            <ThemedText type="smallBold" style={{ color: theme.accent }}>‹ Inicio</ThemedText>
          </Pressable>
          <ThemedText type="title" style={{ color: theme.accent }}>Usuarios y roles</ThemedText>
          <ThemedText themeColor="textSecondary">Define qué puede hacer cada rol y asigna un rol a cada cuenta. Los cambios se guardan al tocar.</ThemedText>
          {error && <ThemedText style={{ color: theme.accent }}>{error}</ThemedText>}
          {aviso && <ThemedText type="smallBold" style={{ color: '#1E8E3E' }}>✓ {aviso}</ThemedText>}

          <ThemedText type="subtitle" style={styles.seccion}>Roles</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">Toca un permiso para activarlo o quitarlo.</ThemedText>
          {roles.map((rol) => {
            const fijo = rol.nombre === 'Administrador';
            return (
            <ThemedView key={rol.id} type="backgroundElement" style={styles.tarjeta}>
              <View style={styles.fila}>
                <ThemedText type="smallBold" style={styles.flex}>{rol.nombre}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {usuarios.filter((u) => u.rol_id === rol.id).length} cuenta(s)
                </ThemedText>
                {!fijo && <BotonBorrar clave={`rol-${rol.id}`} fn={() => borrarRol(rol.id)} />}
              </View>
              {fijo ? (
                <ThemedText type="small" themeColor="textSecondary">Acceso total. Este rol es fijo y no se puede editar ni borrar.</ThemedText>
              ) : (
              <View style={styles.chips}>
                {permisos.map((p) => {
                  const activo = rol.permisos.includes(p);
                  const permisosNuevos = activo ? rol.permisos.filter((x) => x !== p) : [...rol.permisos, p];
                  return (
                    <Pressable key={p} accessibilityRole="checkbox" accessibilityState={{ checked: activo }}
                      onPress={hacer(() => guardarRol({ ...rol, permisos: permisosNuevos }))} style={chip(activo)}>
                      <ThemedText type="small" style={chipTexto(activo)}>{marca(activo)}{NOMBRE_PERMISO[p] ?? p}</ThemedText>
                    </Pressable>
                  );
                })}
              </View>
              )}
            </ThemedView>
            );
          })}
          <View style={styles.fila}>
            <TextInput placeholder="Nombre del rol nuevo" placeholderTextColor={theme.textSecondary} value={nuevoRol} onChangeText={setNuevoRol} style={[input, styles.flex]} />
            <Pressable accessibilityRole="button" disabled={!nuevoRol.trim()} style={[styles.boton, { backgroundColor: theme.accent }, !nuevoRol.trim() && styles.apagado]}
              onPress={hacer(async () => { await guardarRol({ nombre: nuevoRol.trim(), permisos: [] }); setNuevoRol(''); }, 'Rol creado')}>
              <ThemedText style={styles.botonTexto}>Crear rol</ThemedText>
            </Pressable>
          </View>

          <ThemedText type="subtitle" style={styles.seccion}>Usuarios</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">La cuenta principal del servidor es siempre administradora y no aparece aquí.</ThemedText>
          {usuarios.map((u) => (
            <ThemedView key={u.id} type="backgroundElement" style={styles.tarjeta}>
              <View style={styles.fila}>
                <ThemedText type="smallBold" style={styles.flex}>{u.usuario}</ThemedText>
                <BotonBorrar clave={`usuario-${u.id}`} fn={() => borrarUsuario(u.id)} />
              </View>
              <View style={styles.chips}>
                {roles.map((r) => (
                  <Pressable key={r.id} accessibilityRole="radio" accessibilityState={{ checked: u.rol_id === r.id }}
                    onPress={hacer(() => guardarUsuario({ ...u, rol_id: r.id }))} style={chip(u.rol_id === r.id)}>
                    <ThemedText type="small" style={chipTexto(u.rol_id === r.id)}>{marca(u.rol_id === r.id)}{r.nombre}</ThemedText>
                  </Pressable>
                ))}
              </View>
              <View style={styles.fila}>
                <TextInput placeholder="Contraseña nueva" placeholderTextColor={theme.textSecondary} secureTextEntry
                  value={claves[u.id] ?? ''} onChangeText={(v) => setClaves((c) => ({ ...c, [u.id]: v }))} style={[input, styles.flex]} />
                <Pressable accessibilityRole="button" disabled={(claves[u.id] ?? '').length < 8}
                  style={[styles.boton, { borderColor: theme.accent, borderWidth: 1 }, (claves[u.id] ?? '').length < 8 && styles.apagado]}
                  onPress={hacer(async () => { await guardarUsuario({ ...u, clave: claves[u.id] }); setClaves((c) => ({ ...c, [u.id]: '' })); }, 'Contraseña cambiada')}>
                  <ThemedText style={{ color: theme.accent }}>Cambiar</ThemedText>
                </Pressable>
              </View>
            </ThemedView>
          ))}

          <ThemedView type="backgroundElement" style={styles.tarjeta}>
            <ThemedText type="smallBold">Usuario nuevo</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">Escribe usuario, contraseña de 8+ caracteres y elige su rol.</ThemedText>
            <TextInput placeholder="Usuario" placeholderTextColor={theme.textSecondary} autoCapitalize="none"
              value={nuevo.usuario} onChangeText={(v) => setNuevo((n) => ({ ...n, usuario: v }))} style={input} />
            <TextInput placeholder="Contraseña (mín. 8)" placeholderTextColor={theme.textSecondary} secureTextEntry
              value={nuevo.clave} onChangeText={(v) => setNuevo((n) => ({ ...n, clave: v }))} style={input} />
            <View style={styles.chips}>
              {roles.map((r) => (
                <Pressable key={r.id} accessibilityRole="radio" accessibilityState={{ checked: nuevo.rol_id === r.id }}
                  onPress={() => setNuevo((n) => ({ ...n, rol_id: r.id }))} style={chip(nuevo.rol_id === r.id)}>
                  <ThemedText type="small" style={chipTexto(nuevo.rol_id === r.id)}>{marca(nuevo.rol_id === r.id)}{r.nombre}</ThemedText>
                </Pressable>
              ))}
            </View>
            {(() => {
              const listo = nuevo.usuario.trim() && nuevo.clave.length >= 8 && nuevo.rol_id;
              return (
            <Pressable accessibilityRole="button" disabled={!listo} style={[styles.boton, { backgroundColor: theme.accent }, !listo && styles.apagado]}
              onPress={hacer(async () => { await guardarUsuario({ ...nuevo, usuario: nuevo.usuario.trim() }); setNuevo({ usuario: '', clave: '', rol_id: 0 }); }, 'Usuario creado')}>
              <ThemedText style={styles.botonTexto}>Crear usuario</ThemedText>
            </Pressable>
              );
            })()}
          </ThemedView>
        </SafeAreaView>
      </ScrollView>
      <BarraPestanas activa="home" />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, alignItems: 'center', paddingBottom: BottomTabInset + Spacing.four },
  content: { width: '100%', maxWidth: MaxContentWidth, paddingHorizontal: Spacing.four, gap: Spacing.three },
  // Debajo de la barra fija superior (~76 px de alto).
  volver: { marginTop: Spacing.six + Spacing.four, alignSelf: 'flex-start' },
  borrar: { paddingVertical: Spacing.one, paddingLeft: Spacing.two },
  apagado: { opacity: 0.4 },
  seccion: { marginTop: Spacing.four },
  tarjeta: { ...SombraTarjeta, padding: Spacing.three, borderRadius: 16, gap: Spacing.two },
  fila: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  flex: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: { borderWidth: 1, borderRadius: 16, paddingHorizontal: Spacing.three, paddingVertical: Spacing.one },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: Spacing.three, minHeight: 44 },
  boton: { minHeight: 44, borderRadius: 10, paddingHorizontal: Spacing.three, alignItems: 'center', justifyContent: 'center' },
  botonTexto: { color: '#FFFFFF', fontWeight: '700' },
});
