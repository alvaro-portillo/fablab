// Administración de cuentas: roles (con los permisos que el administrador elija)
// y usuarios. Solo con permiso `administrar`; el server lo exige igual.
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BarraPestanas } from '@/components/app-tabs';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
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
  const hacer = (fn: () => Promise<unknown>) => async () => {
    try { await fn(); await cargar(); } catch (e) { setError(mensajeDeError(e, 'No se pudo guardar')); }
  };

  const input = [styles.input, { color: theme.text, borderColor: theme.backgroundSelected }];
  const chip = (activo: boolean) => [styles.chip, { borderColor: theme.accent }, activo && { backgroundColor: theme.accent }];
  const chipTexto = (activo: boolean) => ({ color: activo ? '#FFFFFF' : theme.accent });

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
          {error && <ThemedText style={{ color: theme.accent }}>{error}</ThemedText>}

          <ThemedText type="subtitle" style={styles.seccion}>Roles</ThemedText>
          {roles.map((rol) => (
            <ThemedView key={rol.id} type="backgroundElement" style={styles.tarjeta}>
              <View style={styles.fila}>
                <ThemedText type="smallBold" style={styles.flex}>{rol.nombre}</ThemedText>
                <Pressable accessibilityRole="button" onPress={hacer(() => borrarRol(rol.id))}>
                  <ThemedText type="small" themeColor="textSecondary">Borrar</ThemedText>
                </Pressable>
              </View>
              <View style={styles.chips}>
                {permisos.map((p) => {
                  const activo = rol.permisos.includes(p);
                  const permisosNuevos = activo ? rol.permisos.filter((x) => x !== p) : [...rol.permisos, p];
                  return (
                    <Pressable key={p} accessibilityRole="checkbox" accessibilityState={{ checked: activo }}
                      onPress={hacer(() => guardarRol({ ...rol, permisos: permisosNuevos }))} style={chip(activo)}>
                      <ThemedText type="small" style={chipTexto(activo)}>{NOMBRE_PERMISO[p] ?? p}</ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </ThemedView>
          ))}
          <View style={styles.fila}>
            <TextInput placeholder="Nombre del rol nuevo" placeholderTextColor={theme.textSecondary} value={nuevoRol} onChangeText={setNuevoRol} style={[input, styles.flex]} />
            <Pressable accessibilityRole="button" style={[styles.boton, { backgroundColor: theme.accent }]}
              onPress={hacer(async () => { await guardarRol({ nombre: nuevoRol, permisos: [] }); setNuevoRol(''); })}>
              <ThemedText style={styles.botonTexto}>Crear rol</ThemedText>
            </Pressable>
          </View>

          <ThemedText type="subtitle" style={styles.seccion}>Usuarios</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">La cuenta principal del servidor es siempre administradora y no aparece aquí.</ThemedText>
          {usuarios.map((u) => (
            <ThemedView key={u.id} type="backgroundElement" style={styles.tarjeta}>
              <View style={styles.fila}>
                <ThemedText type="smallBold" style={styles.flex}>{u.usuario}</ThemedText>
                <Pressable accessibilityRole="button" onPress={hacer(() => borrarUsuario(u.id))}>
                  <ThemedText type="small" themeColor="textSecondary">Borrar</ThemedText>
                </Pressable>
              </View>
              <View style={styles.chips}>
                {roles.map((r) => (
                  <Pressable key={r.id} accessibilityRole="radio" accessibilityState={{ checked: u.rol_id === r.id }}
                    onPress={hacer(() => guardarUsuario({ ...u, rol_id: r.id }))} style={chip(u.rol_id === r.id)}>
                    <ThemedText type="small" style={chipTexto(u.rol_id === r.id)}>{r.nombre}</ThemedText>
                  </Pressable>
                ))}
              </View>
              <View style={styles.fila}>
                <TextInput placeholder="Contraseña nueva" placeholderTextColor={theme.textSecondary} secureTextEntry
                  value={claves[u.id] ?? ''} onChangeText={(v) => setClaves((c) => ({ ...c, [u.id]: v }))} style={[input, styles.flex]} />
                <Pressable accessibilityRole="button" style={[styles.boton, { borderColor: theme.accent, borderWidth: 1 }]}
                  onPress={hacer(async () => { await guardarUsuario({ ...u, clave: claves[u.id] }); setClaves((c) => ({ ...c, [u.id]: '' })); })}>
                  <ThemedText style={{ color: theme.accent }}>Cambiar</ThemedText>
                </Pressable>
              </View>
            </ThemedView>
          ))}

          <ThemedView type="backgroundElement" style={styles.tarjeta}>
            <ThemedText type="smallBold">Usuario nuevo</ThemedText>
            <TextInput placeholder="Usuario" placeholderTextColor={theme.textSecondary} autoCapitalize="none"
              value={nuevo.usuario} onChangeText={(v) => setNuevo((n) => ({ ...n, usuario: v }))} style={input} />
            <TextInput placeholder="Contraseña (mín. 8)" placeholderTextColor={theme.textSecondary} secureTextEntry
              value={nuevo.clave} onChangeText={(v) => setNuevo((n) => ({ ...n, clave: v }))} style={input} />
            <View style={styles.chips}>
              {roles.map((r) => (
                <Pressable key={r.id} accessibilityRole="radio" accessibilityState={{ checked: nuevo.rol_id === r.id }}
                  onPress={() => setNuevo((n) => ({ ...n, rol_id: r.id }))} style={chip(nuevo.rol_id === r.id)}>
                  <ThemedText type="small" style={chipTexto(nuevo.rol_id === r.id)}>{r.nombre}</ThemedText>
                </Pressable>
              ))}
            </View>
            <Pressable accessibilityRole="button" style={[styles.boton, { backgroundColor: theme.accent }]}
              onPress={hacer(async () => { await guardarUsuario(nuevo); setNuevo({ usuario: '', clave: '', rol_id: 0 }); })}>
              <ThemedText style={styles.botonTexto}>Crear usuario</ThemedText>
            </Pressable>
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
  volver: { marginTop: Spacing.six, alignSelf: 'flex-start' },
  seccion: { marginTop: Spacing.four },
  tarjeta: { padding: Spacing.three, borderRadius: 12, gap: Spacing.two },
  fila: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  flex: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: { borderWidth: 1, borderRadius: 16, paddingHorizontal: Spacing.three, paddingVertical: Spacing.one },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: Spacing.three, minHeight: 44 },
  boton: { minHeight: 44, borderRadius: 10, paddingHorizontal: Spacing.three, alignItems: 'center', justifyContent: 'center' },
  botonTexto: { color: '#FFFFFF', fontWeight: '700' },
});
