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
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.EXPO_BACKEND_URL || process.env.EXPO_BACKEND_URL;

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

export default function AdminScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [stats, setStats] = useState<Stats>({ categories: 0, products: 0, activeProducts: 0 });
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

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

        // Load stats
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
        setShowCreateForm(false);
      } else {
        setShowCreateForm(true);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveRestaurant = async () => {
    if (!name.trim() || !whatsapp.trim()) {
      Alert.alert('Erro', 'Preencha nome e WhatsApp');
      return;
    }

    setSaving(true);
    try {
      const data = {
        name: name.trim(),
        whatsapp: whatsapp.trim(),
        address: address.trim(),
        description: description.trim(),
        primary_color: '#FF6B35',
        secondary_color: '#004E89',
      };

      if (restaurant) {
        // Update
        const res = await fetch(`${API_URL}/api/restaurants/${restaurant.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        const result = await res.json();
        if (result.success) {
          Alert.alert('Sucesso', 'Restaurante atualizado!');
          loadData();
        }
      } else {
        // Create
        const res = await fetch(`${API_URL}/api/restaurants`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        const result = await res.json();
        if (result.success) {
          Alert.alert('Sucesso', 'Restaurante criado!');
          loadData();
        }
      }
    } catch (error) {
      Alert.alert('Erro', 'Falha ao salvar restaurante');
      console.error(error);
    } finally {
      setSaving(false);
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
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: isDark ? '#000' : '#f5f5f5' }]}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: isDark ? '#fff' : '#000' }]}>Painel Admin</Text>
          <Text style={[styles.subtitle, { color: isDark ? '#aaa' : '#666' }]}>Gerencie seu restaurante</Text>
        </View>

        {!restaurant || showCreateForm ? (
          <View style={[styles.card, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
            <Text style={[styles.cardTitle, { color: isDark ? '#fff' : '#000' }]}>Configurar Restaurante</Text>
            
            <TextInput
              style={[styles.input, { backgroundColor: isDark ? '#000' : '#f9f9f9', color: isDark ? '#fff' : '#000' }]}
              placeholder="Nome do Restaurante"
              placeholderTextColor={isDark ? '#666' : '#999'}
              value={name}
              onChangeText={setName}
            />
            
            <TextInput
              style={[styles.input, { backgroundColor: isDark ? '#000' : '#f9f9f9', color: isDark ? '#fff' : '#000' }]}
              placeholder="WhatsApp (ex: 11999999999)"
              placeholderTextColor={isDark ? '#666' : '#999'}
              value={whatsapp}
              onChangeText={setWhatsapp}
              keyboardType="phone-pad"
            />
            
            <TextInput
              style={[styles.input, { backgroundColor: isDark ? '#000' : '#f9f9f9', color: isDark ? '#fff' : '#000' }]}
              placeholder="Endereço (opcional)"
              placeholderTextColor={isDark ? '#666' : '#999'}
              value={address}
              onChangeText={setAddress}
            />
            
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: isDark ? '#000' : '#f9f9f9', color: isDark ? '#fff' : '#000' }]}
              placeholder="Descrição do restaurante (opcional)"
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
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {restaurant ? 'Atualizar' : 'Criar Restaurante'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Stats Cards */}
            <View style={styles.statsContainer}>
              <View style={[styles.statCard, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
                <Ionicons name="grid" size={24} color="#FF6B35" />
                <Text style={[styles.statNumber, { color: isDark ? '#fff' : '#000' }]}>{stats.categories}</Text>
                <Text style={[styles.statLabel, { color: isDark ? '#aaa' : '#666' }]}>Categorias</Text>
              </View>
              
              <View style={[styles.statCard, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
                <Ionicons name="fast-food" size={24} color="#4CAF50" />
                <Text style={[styles.statNumber, { color: isDark ? '#fff' : '#000' }]}>{stats.activeProducts}</Text>
                <Text style={[styles.statLabel, { color: isDark ? '#aaa' : '#666' }]}>Produtos Ativos</Text>
              </View>
              
              <View style={[styles.statCard, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
                <Ionicons name="apps" size={24} color="#2196F3" />
                <Text style={[styles.statNumber, { color: isDark ? '#fff' : '#000' }]}>{stats.products}</Text>
                <Text style={[styles.statLabel, { color: isDark ? '#aaa' : '#666' }]}>Total Produtos</Text>
              </View>
            </View>

            {/* Quick Actions */}
            <View style={[styles.card, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
              <Text style={[styles.cardTitle, { color: isDark ? '#fff' : '#000' }]}>Ações Rápidas</Text>
              
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => setShowCreateForm(true)}
              >
                <Ionicons name="restaurant" size={24} color="#FF6B35" />
                <Text style={[styles.actionButtonText, { color: isDark ? '#fff' : '#000' }]}>Editar Restaurante</Text>
                <Ionicons name="chevron-forward" size={24} color="#ccc" />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => Alert.alert('Em breve', 'Gestão de categorias será implementada')}
              >
                <Ionicons name="grid" size={24} color="#4CAF50" />
                <Text style={[styles.actionButtonText, { color: isDark ? '#fff' : '#000' }]}>Gerenciar Categorias</Text>
                <Ionicons name="chevron-forward" size={24} color="#ccc" />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => Alert.alert('Em breve', 'Gestão de produtos será implementada')}
              >
                <Ionicons name="fast-food" size={24} color="#2196F3" />
                <Text style={[styles.actionButtonText, { color: isDark ? '#fff' : '#000' }]}>Gerenciar Produtos</Text>
                <Ionicons name="chevron-forward" size={24} color="#ccc" />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => Alert.alert('Em breve', 'Geração de QR Code será implementada')}
              >
                <Ionicons name="qr-code" size={24} color="#9C27B0" />
                <Text style={[styles.actionButtonText, { color: isDark ? '#fff' : '#000' }]}>Gerar QR Code</Text>
                <Ionicons name="chevron-forward" size={24} color="#ccc" />
              </TouchableOpacity>
            </View>

            {/* Restaurant Info */}
            <View style={[styles.card, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
              <Text style={[styles.cardTitle, { color: isDark ? '#fff' : '#000' }]}>Informações</Text>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: isDark ? '#aaa' : '#666' }]}>Nome:</Text>
                <Text style={[styles.infoValue, { color: isDark ? '#fff' : '#000' }]}>{restaurant.name}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: isDark ? '#aaa' : '#666' }]}>WhatsApp:</Text>
                <Text style={[styles.infoValue, { color: isDark ? '#fff' : '#000' }]}>{restaurant.whatsapp}</Text>
              </View>
              {restaurant.address && (
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: isDark ? '#aaa' : '#666' }]}>Endereço:</Text>
                  <Text style={[styles.infoValue, { color: isDark ? '#fff' : '#000' }]}>{restaurant.address}</Text>
                </View>
              )}
            </View>
          </>
        )}
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
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
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
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  input: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    fontSize: 16,
  },
  textArea: {
    height: 80,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  primaryButton: {
    backgroundColor: '#FF6B35',
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
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
  infoRow: {
    flexDirection: 'row',
    paddingVertical: 8,
  },
  infoLabel: {
    width: 100,
    fontSize: 14,
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
});
