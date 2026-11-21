import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert } from 'react-native';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';

// Conexión automática permanente (funciona en Wi-Fi de la escuela, casa o datos)
const localtunnel = require('localtunnel');
(async () => {
  const tunnel = await localtunnel({ port: 8080, subdomain: 'gpsolute-cesun' });
  console.log('🌐 Túnel automático activo en:', tunnel.url);
})();

export default function IndexScreen() {
  const [role, setRole] = useState<'none' | 'car' | 'monitor'>('none');
  const [connected, setConnected] = useState(false);
  const [carData, setCarData] = useState({
    latitude: 32.5149,
    longitude: -117.0382,
    speed: 0,
    timestamp: '',
  });

  const ws = useRef<WebSocket | null>(null);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    if (role === 'none') return;

    ws.current = new WebSocket(WS_URL);

    ws.current.onopen = () => {
      setConnected(true);
      if (role === 'car') {
        startTracking();
      }
    };

    ws.current.onmessage = (event) => {
      if (role === 'monitor') {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed.coords) {
            setCarData({
              latitude: parsed.coords.latitude,
              longitude: parsed.coords.longitude,
              speed: parsed.coords.speed ? Math.round(parsed.coords.speed * 3.6) : 0,
              timestamp: new Date(parsed.timestamp).toLocaleTimeString(),
            });
          }
        } catch (e) {
          console.log('Error leyendo paquete:', e);
        }
      }
    };

    ws.current.onclose = () => {
      setConnected(false);
    };

    ws.current.onerror = () => {
      Alert.alert(
        'Servidor inactivo',
        'Asegúrate de tener corriendo "node server.js" y el túnel en tu laptop.'
      );
    };

    return () => {
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [role]);

  const startTracking = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso denegado', 'Se necesita acceso al GPS para el Modo Carro.');
      setRole('none');
      return;
    }

    locationSubscription.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 2000,
        distanceInterval: 2,
      },
      (loc) => {
        const payload = {
          deviceId: 'car-unit-01',
          timestamp: loc.timestamp,
          coords: {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            speed: loc.coords.speed || 0,
          },
        };

        setCarData({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          speed: loc.coords.speed ? Math.round(loc.coords.speed * 3.6) : 0,
          timestamp: new Date(loc.timestamp).toLocaleTimeString(),
        });

        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
          ws.current.send(JSON.stringify(payload));
        }
      }
    );
  };

  if (role === 'none') {
    return (
      <View style={styles.container}>
        <Text style={styles.brand}>GPSolute</Text>
        <Text style={styles.subtitle}>Sistema de Rastreo Vehicular en Tiempo Real</Text>

        <TouchableOpacity style={[styles.button, styles.carBtn]} onPress={() => setRole('car')}>
          <Text style={styles.btnText}>🚗 Modo Carro (Emisor GPS)</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, styles.monitorBtn]} onPress={() => setRole('monitor')}>
          <Text style={styles.btnText}>📱 Modo Monitor (Receptor Mapa)</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {role === 'car' ? '🚗 MODO CARRO (EMISOR)' : '📱 MODO MONITOR (MAPA)'}
        </Text>
        <Text style={[styles.status, { color: connected ? '#10b981' : '#ef4444' }]}>
          {connected ? '● Conectado Automáticamente' : '● Conectando...'}
        </Text>
      </View>

      {role === 'monitor' ? (
        <MapView
          style={styles.map}
          region={{
            latitude: carData.latitude,
            longitude: carData.longitude,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          }}
        >
          <Marker
            coordinate={{ latitude: carData.latitude, longitude: carData.longitude }}
            title="Vehículo Rastreado"
            description={`Velocidad: ${carData.speed} km/h`}
          />
        </MapView>
      ) : (
        <View style={styles.telemetryBox}>
          <Text style={styles.telemetryLabel}>Transmitiendo coordenadas en tiempo real...</Text>
          <Text style={styles.coordText}>Latitud: {carData.latitude.toFixed(6)}</Text>
          <Text style={styles.coordText}>Longitud: {carData.longitude.toFixed(6)}</Text>
          <Text style={styles.coordText}>Velocidad: {carData.speed} km/h</Text>
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Última señal: {carData.timestamp || 'Esperando datos...'} | Vel: {carData.speed} km/h
        </Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => setRole('none')}>
          <Text style={styles.backText}>Cambiar Modo</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center' },
  brand: { fontSize: 38, fontWeight: 'bold', color: '#38bdf8', marginBottom: 6 },
  subtitle: { fontSize: 15, color: '#94a3b8', marginBottom: 40 },
  button: { width: '82%', padding: 18, borderRadius: 12, alignItems: 'center', marginVertical: 10 },
  carBtn: { backgroundColor: '#0284c7' },
  monitorBtn: { backgroundColor: '#059669' },
  btnText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  header: { width: '100%', padding: 16, backgroundColor: '#1e293b', alignItems: 'center', paddingTop: 45 },
  headerTitle: { color: '#f8fafc', fontSize: 18, fontWeight: 'bold' },
  status: { fontSize: 13, fontWeight: '600', marginTop: 4 },
  map: { flex: 1, width: '100%' },
  telemetryBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  telemetryLabel: { color: '#38bdf8', fontSize: 16, marginBottom: 20, textAlign: 'center' },
  coordText: { color: '#f8fafc', fontSize: 20, fontWeight: 'bold', marginVertical: 6 },
  footer: { width: '100%', padding: 16, backgroundColor: '#1e293b', alignItems: 'center', paddingBottom: 30 },
  footerText: { color: '#cbd5e1', fontSize: 13, marginBottom: 10 },
  backBtn: { backgroundColor: '#334155', paddingVertical: 8, paddingHorizontal: 20, borderRadius: 8 },
  backText: { color: '#f8fafc', fontSize: 14 },
});