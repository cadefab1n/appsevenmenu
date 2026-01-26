import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
  Image,
  Alert,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

export default function QRCodeScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [loading, setLoading] = useState(true);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [menuUrl, setMenuUrl] = useState<string | null>(null);
  const [restaurantName, setRestaurantName] = useState('');

  const loadData = async () => {
    try {
      const restaurantsRes = await fetch(`${API_URL}/api/restaurants`);
      const restaurantsData = await restaurantsRes.json();
      
      if (restaurantsData.restaurants && restaurantsData.restaurants.length > 0) {
        const restaurant = restaurantsData.restaurants[0];
        setRestaurantName(restaurant.name);

        const qrRes = await fetch(`${API_URL}/api/qrcode/${restaurant.id}`);
        const qrData = await qrRes.json();
        
        if (qrData.success) {
          setQrCode(qrData.qr_code);
          setMenuUrl(qrData.url);
        }
      }
    } catch (error) {
      console.error('Error loading QR code:', error);
      Alert.alert('Erro', 'Falha ao carregar QR Code');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleShare = async () => {
    if (menuUrl) {
      try {
        await Share.share({
          message: `Confira nosso cardápio digital do ${restaurantName}!\n\n${menuUrl}`,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: isDark ? '#000' : '#fff' }]}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#000' : '#f5f5f5' }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/admin-dashboard')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={isDark ? '#fff' : '#000'} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: isDark ? '#fff' : '#000' }]}>QR Code</Text>
        <View style={styles.backButton} />
      </View>

      <View style={styles.content}>
        <View style={[styles.card, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
          <Text style={[styles.cardTitle, { color: isDark ? '#fff' : '#000' }]}>
            {restaurantName}
          </Text>
          <Text style={[styles.subtitle, { color: isDark ? '#aaa' : '#666' }]}>
            Escaneie o QR Code para acessar o cardápio
          </Text>

          {qrCode && (
            <View style={styles.qrContainer}>
              <Image
                source={{ uri: qrCode }}
                style={styles.qrImage}
                resizeMode="contain"
              />
            </View>
          )}

          {menuUrl && (
            <View style={styles.urlContainer}>
              <Text style={[styles.urlLabel, { color: isDark ? '#aaa' : '#666' }]}>Link do cardápio:</Text>
              <Text style={[styles.urlText, { color: '#FF6B35' }]} numberOfLines={1}>
                {menuUrl}
              </Text>
            </View>
          )}

          <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
            <Ionicons name="share-social" size={24} color="#fff" />
            <Text style={styles.shareButtonText}>Compartilhar</Text>
          </TouchableOpacity>

          <View style={styles.instructions}>
            <Text style={[styles.instructionsTitle, { color: isDark ? '#fff' : '#000' }]}>
              Como usar:
            </Text>
            <Text style={[styles.instructionsText, { color: isDark ? '#aaa' : '#666' }]}>
              • Imprima este QR Code e coloque nas mesas{`\n`}
              • Clientes escaneiam com a câmera do celular{`\n`}
              • Compartilhe o link nas redes sociais{`\n`}
              • Use no cardápio físico ou delivery
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 24,
    textAlign: 'center',
  },
  qrContainer: {
    width: 280,
    height: 280,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  qrImage: {
    width: '100%',
    height: '100%',
  },
  urlContainer: {
    width: '100%',
    marginBottom: 24,
  },
  urlLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  urlText: {
    fontSize: 14,
    fontWeight: '600',
  },
  shareButton: {
    flexDirection: 'row',
    backgroundColor: '#25D366',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  instructions: {
    width: '100%',
    marginTop: 16,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  instructionsText: {
    fontSize: 14,
    lineHeight: 22,
  },
});
