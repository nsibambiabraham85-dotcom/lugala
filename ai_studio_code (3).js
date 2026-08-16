import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, Dimensions, ActivityIndicator } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, set, push, onValue, update } from 'firebase/database';

const firebaseConfig = {
  apiKey: "YOUR_FIREBASE_KEY",
  authDomain: "twende-app.firebaseapp.com",
  databaseURL: "https://twende-app-default-rtdb.firebaseio.com",
  projectId: "twende-app",
  appId: "1:12345:web:6789"
};

let db = null;
if (firebaseConfig.apiKey !== "YOUR_FIREBASE_KEY") {
  const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
  db = getDatabase(app);
}

export default function App() {
  const [role, setRole] = useState(null); 
  const [location, setLocation] = useState(null);
  const [orders, setOrders] = useState([]);
  const [destination, setDestination] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return Alert.alert("GPS Required", "Twende needs GPS.");
      let loc = await Location.getCurrentPositionAsync({});
      setLocation(loc.coords);
      setLoading(false);
      if (db) {
        onValue(ref(db, 'orders/'), (snapshot) => {
          const data = snapshot.val();
          const list = data ? Object.keys(data).map(id => ({ id, ...data[id] })) : [];
          setOrders(list.filter(o => o.status === 'searching'));
        });
      }
    })();
  }, []);

  const placeOrder = () => {
    if (!destination || !db) return Alert.alert("Error", "Check destination or Firebase connection.");
    const newOrderRef = push(ref(db, 'orders/'));
    set(newOrderRef, {
      pickup: { latitude: location.latitude, longitude: location.longitude },
      dropoff: destination,
      status: 'searching',
      timestamp: Date.now()
    });
    Alert.alert("Twende!", "Finding your rider...");
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#FFB020" /></View>;

  if (!role) {
    return (
      <View style={styles.centered}>
        <Text style={styles.logo}>TWENDE</Text>
        <TouchableOpacity style={styles.btn} onPress={() => setRole('client')}><Text style={styles.btnT}>CLIENT</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.btn, {backgroundColor: '#2FA36B'}]} onPress={() => setRole('rider')}><Text style={styles.btnT}>RIDER</Text></TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView 
        style={styles.map} 
        provider={PROVIDER_GOOGLE}
        initialRegion={{ latitude: location.latitude, longitude: location.longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 }}
        onPress={(e) => role === 'client' && setDestination(e.nativeEvent.coordinate)}
      >
        <Marker coordinate={location} title="Me" pinColor="blue" />
        {destination && <Marker coordinate={destination} title="Drop-off" />}
        {role === 'rider' && orders.map(o => <Marker key={o.id} coordinate={o.pickup} onPress={() => update(ref(db, `orders/${o.id}`), {status: 'accepted'})} />)}
      </MapView>
      <View style={styles.overlay}>
        {role === 'client' ? <TouchableOpacity style={styles.action} onPress={placeOrder}><Text style={styles.btnT}>CONFIRM BODA</Text></TouchableOpacity> : <Text style={styles.btnT}>WAITING...</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, backgroundColor: '#16151A', justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1 },
  map: { width: '100%', height: '100%' },
  logo: { fontSize: 50, fontWeight: 'bold', color: '#FFB020', marginBottom: 40 },
  btn: { width: 250, padding: 20, borderRadius: 15, backgroundColor: '#FFB020', marginBottom: 20, alignItems: 'center' },
  btnT: { fontWeight: 'bold', color: '#16151A', textAlign: 'center' },
  overlay: { position: 'absolute', bottom: 40, left: 20, right: 20 },
  action: { backgroundColor: '#FFB020', padding: 20, borderRadius: 15, alignItems: 'center' }
});