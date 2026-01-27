import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface Restaurant {
  id: string;
  name: string;
  whatsapp: string;
  address?: string;
  primary_color: string;
  secondary_color: string;
  description?: string;
}

interface Stats {
  categories: number;
  products: number;
  activeProducts: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [stats, setStats] = useState<Stats>({ categories: 0, products: 0, activeProducts: 0 });
  const [loading, setLoading] = useState(true);
  const [showEditForm, setShowEditForm] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const isAuth = await AsyncStorage.getItem('admin_authenticated');
      if (!isAuth) {
        Alert.alert('Acesso Negado', 'Você precisa fazer login primeiro', [
          { text: 'OK', onPress: () => router.push('/admin-login') }
        ]);
        return;
      }
      loadData();
    } catch (error) {
      console.error('Error checking auth:', error);
      router.push('/admin-login');
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Sair',
      'Deseja sair do painel administrativo?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('admin_authenticated');
            await AsyncStorage.removeItem('admin_login_time');
            router.push('/menu');
          },
        },
      ]
    );
  };

  const loadData = async () => {
    try {
      const restaurantsRes = await fetch(`${API_URL}/api/restaurants`);
      const restaurantsData = await restaurantsRes.json();
      
      if (restaurantsData.restaurants && restaurantsData.restaurants.length > 0) {
        const rest = restaurantsData.restaurants[0];
        setRestaurant(rest);
        setName(rest.name);
        setWhatsapp(rest.whatsapp);
        setAddress(rest.address || '');
        setDescription(rest.description || '');

        const categoriesRes = await fetch(`${API_URL}/api/restaurants/${rest.id}/categories`);
        const categoriesData = await categoriesRes.json();
        
        const productsRes = await fetch(`${API_URL}/api/restaurants/${rest.id}/products`);
        const productsData = await productsRes.json();
        
        const activeCount = productsData.products?.filter((p: any) => p.active).length || 0;
        
        setStats({
          categories: categoriesData.categories?.length || 0,
          products: productsData.products?.length || 0,
          activeProducts: activeCount,
        });
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateWhatsApp = (number: string): boolean => {
    const cleaned = number.replace(/\D/g, '');
    return cleaned.length >= 10 && cleaned.length <= 15;
  };

  const handleSaveRestaurant = async () => {
    if (!name.trim() || !whatsapp.trim()) {
      Alert.alert('Erro', 'Preencha nome e WhatsApp');
      return;
    }

    if (!validateWhatsApp(whatsapp)) {
      Alert.alert('Erro', 'Número de WhatsApp inválido. Use apenas números (ex: 5583982324744)');
      return;
    }

    setSaving(true);
    try {
      const data = {
        name: name.trim(),
        whatsapp: whatsapp.replace(/\D/g, ''),
        address: address.trim(),
        description: description.trim(),
        primary_color: restaurant?.primary_color || '#ffea07',
        secondary_color: restaurant?.secondary_color || '#FF6B35',
      };

      const res = await fetch(`${API_URL}/api/restaurants/${restaurant?.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (result.success) {
        Alert.alert('Sucesso!', 'Configurações salvas com sucesso!');
        setShowEditForm(false);
        loadData();
      }
    } catch (error) {
      Alert.alert('Erro', 'Falha ao salvar configurações');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: isDark ? '#000' : '#fff' }]}>
        <ActivityIndicator size="large" color="#ffea07" />
        <Text style={[styles.loadingText, { color: isDark ? '#fff' : '#000' }]}>Carregando...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: isDark ? '#000' : '#f5f5f5' }]}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header com Logout */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: isDark ? '#fff' : '#000' }]}>Painel Admin</Text>
            <Text style={[styles.subtitle, { color: isDark ? '#aaa' : '#666' }]}>Gerencie seu restaurante</Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Ionicons name="log-out" size={24} color="#F44336" />
          </TouchableOpacity>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
            <Ionicons name="grid" size={24} color="#ffea07" />
            <Text style={[styles.statNumber, { color: isDark ? '#fff' : '#000' }]}>{stats.categories}</Text>
            <Text style={[styles.statLabel, { color: isDark ? '#aaa' : '#666' }]}>Categorias</Text>
          </View>
          
          <View style={[styles.statCard, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
            <Ionicons name="fast-food" size={24} color="#4CAF50" />
            <Text style={[styles.statNumber, { color: isDark ? '#fff' : '#000' }]}>{stats.activeProducts}</Text>
            <Text style={[styles.statLabel, { color: isDark ? '#aaa' : '#666' }]}>Ativos</Text>
          </View>
          
          <View style={[styles.statCard, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
            <Ionicons name="apps" size={24} color="#2196F3" />
            <Text style={[styles.statNumber, { color: isDark ? '#fff' : '#000' }]}>{stats.products}</Text>
            <Text style={[styles.statLabel, { color: isDark ? '#aaa' : '#666' }]}>Total</Text>
          </View>
        </View>

        {/* Configurações do Restaurante */}
        <View style={[styles.card, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: isDark ? '#fff' : '#000' }]}>🏪 Restaurante</Text>
            <TouchableOpacity onPress={() => setShowEditForm(!showEditForm)}>
              <Ionicons name={showEditForm ? 'close' : 'pencil'} size={24} color="#ffea07" />
            </TouchableOpacity>
          </View>

          {showEditForm ? (
            <View>
              <TextInput
                style={[styles.input, { backgroundColor: isDark ? '#000' : '#f9f9f9', color: isDark ? '#fff' : '#000' }]}
                placeholder="Nome do Restaurante *"
                placeholderTextColor={isDark ? '#666' : '#999'}
                value={name}
                onChangeText={setName}
              />
              
              <View style={styles.inputWithIcon}>
                <Ionicons name="logo-whatsapp" size={20} color="#25D366" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { backgroundColor: isDark ? '#000' : '#f9f9f9', color: isDark ? '#fff' : '#000', paddingLeft: 40 }]}
                  placeholder="WhatsApp * (ex: 5583982324744)"
                  placeholderTextColor={isDark ? '#666' : '#999'}
                  value={whatsapp}
                  onChangeText={setWhatsapp}
                  keyboardType="phone-pad"
                />
              </View>
              <Text style={[styles.helperText, { color: isDark ? '#666' : '#999' }]}>
                ℹ️ Digite apenas números (DDI + DDD + Número)
              </Text>
              
              <TextInput
                style={[styles.input, { backgroundColor: isDark ? '#000' : '#f9f9f9', color: isDark ? '#fff' : '#000' }]}
                placeholder="Endereço"
                placeholderTextColor={isDark ? '#666' : '#999'}
                value={address}
                onChangeText={setAddress}
              />
              
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: isDark ? '#000' : '#f9f9f9', color: isDark ? '#fff' : '#000' }]}
                placeholder="Descrição"
                placeholderTextColor={isDark ? '#666' : '#999'}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
              />
              
              <TouchableOpacity
                style={[styles.primaryButton, { opacity: saving ? 0.5 : 1 }]}
                onPress={handleSaveRestaurant}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <Text style={styles.primaryButtonText}>Salvar Configurações</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: isDark ? '#aaa' : '#666' }]}>Nome:</Text>
                <Text style={[styles.infoValue, { color: isDark ? '#fff' : '#000' }]}>{restaurant?.name}</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="logo-whatsapp" size={16} color="#25D366" />
                <Text style={[styles.infoLabel, { color: isDark ? '#aaa' : '#666' }]}>WhatsApp:</Text>
                <Text style={[styles.infoValue, { color: isDark ? '#fff' : '#000' }]}>{restaurant?.whatsapp}</Text>
              </View>
              {restaurant?.address && (
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: isDark ? '#aaa' : '#666' }]}>Endereço:</Text>
                  <Text style={[styles.infoValue, { color: isDark ? '#fff' : '#000' }]}>{restaurant.address}</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Ações Rápidas */}
        <View style={[styles.card, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
          <Text style={[styles.cardTitle, { color: isDark ? '#fff' : '#000' }]}>⚡ Ações Rápidas</Text>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/admin/categories')}
          >
            <Ionicons name="grid" size={24} color="#4CAF50" />
            <Text style={[styles.actionButtonText, { color: isDark ? '#fff' : '#000' }]}>Gerenciar Categorias</Text>
            <Ionicons name="chevron-forward" size={24} color="#ccc" />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/admin/products')}
          >
            <Ionicons name="fast-food" size={24} color="#2196F3" />
            <Text style={[styles.actionButtonText, { color: isDark ? '#fff' : '#000' }]}>Gerenciar Produtos</Text>
            <Ionicons name="chevron-forward" size={24} color="#ccc" />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/admin/qrcode')}
          >
            <Ionicons name="qr-code" size={24} color="#9C27B0" />
            <Text style={[styles.actionButtonText, { color: isDark ? '#fff' : '#000' }]}>Gerar QR Code</Text>
            <Ionicons name="chevron-forward" size={24} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/menu')}
          >
            <Ionicons name="eye" size={24} color="#ffea07" />
            <Text style={[styles.actionButtonText, { color: isDark ? '#fff' : '#000' }]}>Ver Cardápio (Cliente)</Text>
            <Ionicons name="chevron-forward" size={24} color="#ccc" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 60,
    paddingBottom: 100,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
  },
  logoutButton: {
    padding: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  input: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    fontSize: 16,
  },
  inputWithIcon: {
    position: 'relative',
  },
  inputIcon: {
    position: 'absolute',
    left: 12,
    top: 14,
    zIndex: 1,
  },
  textArea: {
    height: 80,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 12,
    marginBottom: 12,
    marginTop: -8,
  },
  primaryButton: {
    backgroundColor: '#ffea07',
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    alignItems: 'center',
    gap: 8,
  },
  infoLabel: {
    fontSize: 14,
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  actionButtonText: {
    flex: 1,
    fontSize: 16,
    marginLeft: 12,
  },
});
