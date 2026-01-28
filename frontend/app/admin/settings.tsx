import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Switch,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface Restaurant {
  id: string;
  name: string;
  description?: string;
  logo?: string;
  address?: string;
  whatsapp?: string;
  primary_color?: string;
  opening_hours?: string;
  is_open?: boolean;
  closed_message?: string;
  min_order?: number;
  delivery_fee?: number;
  pickup_enabled?: boolean;
  whatsapp_message?: string;
  thank_you_message?: string;
}

export default function SettingsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    logo: '',
    address: '',
    whatsapp: '',
    primary_color: '#E63946',
    opening_hours: '',
    is_open: true,
    closed_message: 'Estamos fechados no momento',
    min_order: '',
    delivery_fee: '',
    pickup_enabled: true,
    whatsapp_message: '',
    thank_you_message: 'Obrigado pelo pedido!',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await fetch(`${API_URL}/api/restaurants`);
      const data = await res.json();
      
      if (data.restaurants?.length > 0) {
        const rest = data.restaurants[0];
        setRestaurant(rest);
        setFormData({
          name: rest.name || '',
          description: rest.description || '',
          logo: rest.logo || '',
          address: rest.address || '',
          whatsapp: rest.whatsapp || '',
          primary_color: rest.primary_color || '#E63946',
          opening_hours: rest.opening_hours || '',
          is_open: rest.is_open !== false,
          closed_message: rest.closed_message || 'Estamos fechados no momento',
          min_order: rest.min_order?.toString() || '',
          delivery_fee: rest.delivery_fee?.toString() || '',
          pickup_enabled: rest.pickup_enabled !== false,
          whatsapp_message: rest.whatsapp_message || '',
          thank_you_message: rest.thank_you_message || 'Obrigado pelo pedido!',
        });
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const pickLogo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setFormData({ ...formData, logo: `data:image/jpeg;base64,${result.assets[0].base64}` });
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.whatsapp) {
      Alert.alert('Erro', 'Nome e WhatsApp são obrigatórios');
      return;
    }

    setSaving(true);

    try {
      const res = await fetch(`${API_URL}/api/restaurants/${restaurant?.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          min_order: parseFloat(formData.min_order) || 0,
          delivery_fee: parseFloat(formData.delivery_fee) || 0,
        }),
      });

      if (res.ok) {
        Alert.alert('Sucesso', 'Configurações salvas!');
      }
    } catch (error) {
      Alert.alert('Erro', 'Falha ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const colorOptions = [
    '#E63946', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#000000'
  ];

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#6B7280" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.push('/admin-dashboard')}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Configurações</Text>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color="#3B82F6" />
          ) : (
            <Text style={styles.saveBtnText}>Salvar</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Logo */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Logo do Restaurante</Text>
          <TouchableOpacity style={styles.logoUpload} onPress={pickLogo}>
            {formData.logo ? (
              <Image source={{ uri: formData.logo }} style={styles.logoImage} />
            ) : (
              <>
                <Ionicons name="camera-outline" size={32} color="#9CA3AF" />
                <Text style={styles.logoText}>Adicionar logo</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Info Básica */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informações Básicas</Text>
          
          <Text style={styles.label}>Nome do Restaurante *</Text>
          <TextInput
            style={styles.input}
            placeholder="Nome do restaurante"
            placeholderTextColor="#9CA3AF"
            value={formData.name}
            onChangeText={(text) => setFormData({ ...formData, name: text })}
          />
          
          <Text style={styles.label}>Descrição</Text>
          <TextInput
            style={[styles.input, { height: 80 }]}
            placeholder="Descrição curta"
            placeholderTextColor="#9CA3AF"
            value={formData.description}
            onChangeText={(text) => setFormData({ ...formData, description: text })}
            multiline
            textAlignVertical="top"
          />
          
          <Text style={styles.label}>Endereço</Text>
          <TextInput
            style={styles.input}
            placeholder="Endereço completo"
            placeholderTextColor="#9CA3AF"
            value={formData.address}
            onChangeText={(text) => setFormData({ ...formData, address: text })}
          />
        </View>

        {/* Contato */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contato</Text>
          
          <Text style={styles.label}>WhatsApp *</Text>
          <TextInput
            style={styles.input}
            placeholder="5583999999999"
            placeholderTextColor="#9CA3AF"
            value={formData.whatsapp}
            onChangeText={(text) => setFormData({ ...formData, whatsapp: text })}
            keyboardType="phone-pad"
          />
          <Text style={styles.hint}>Formato: 55 + DDD + número (sem espaços)</Text>
        </View>

        {/* Horário */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Funcionamento</Text>
          
          <View style={styles.switchRow}>
            <View>
              <Text style={styles.switchLabel}>Restaurante aberto</Text>
              <Text style={styles.switchHint}>Desative para fechar manualmente</Text>
            </View>
            <Switch
              value={formData.is_open}
              onValueChange={(value) => setFormData({ ...formData, is_open: value })}
              trackColor={{ false: '#FEE2E2', true: '#D1FAE5' }}
              thumbColor={formData.is_open ? '#10B981' : '#EF4444'}
            />
          </View>
          
          <Text style={styles.label}>Horário de Funcionamento</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: 11:00 - 22:00"
            placeholderTextColor="#9CA3AF"
            value={formData.opening_hours}
            onChangeText={(text) => setFormData({ ...formData, opening_hours: text })}
          />
          
          <Text style={styles.label}>Mensagem quando fechado</Text>
          <TextInput
            style={styles.input}
            placeholder="Estamos fechados no momento"
            placeholderTextColor="#9CA3AF"
            value={formData.closed_message}
            onChangeText={(text) => setFormData({ ...formData, closed_message: text })}
          />
        </View>

        {/* Delivery */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery e Retirada</Text>
          
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Permitir retirada no local</Text>
            <Switch
              value={formData.pickup_enabled}
              onValueChange={(value) => setFormData({ ...formData, pickup_enabled: value })}
              trackColor={{ false: '#E5E7EB', true: '#DBEAFE' }}
              thumbColor={formData.pickup_enabled ? '#3B82F6' : '#9CA3AF'}
            />
          </View>
          
          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Text style={styles.label}>Pedido Mínimo</Text>
              <TextInput
                style={styles.input}
                placeholder="0,00"
                placeholderTextColor="#9CA3AF"
                value={formData.min_order}
                onChangeText={(text) => setFormData({ ...formData, min_order: text })}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.halfInput}>
              <Text style={styles.label}>Taxa de Entrega</Text>
              <TextInput
                style={styles.input}
                placeholder="0,00"
                placeholderTextColor="#9CA3AF"
                value={formData.delivery_fee}
                onChangeText={(text) => setFormData({ ...formData, delivery_fee: text })}
                keyboardType="decimal-pad"
              />
            </View>
          </View>
        </View>

        {/* Visual */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Visual</Text>
          
          <Text style={styles.label}>Cor Principal</Text>
          <View style={styles.colorOptions}>
            {colorOptions.map(color => (
              <TouchableOpacity
                key={color}
                style={[
                  styles.colorOption,
                  { backgroundColor: color },
                  formData.primary_color === color && styles.colorOptionSelected,
                ]}
                onPress={() => setFormData({ ...formData, primary_color: color })}
              >
                {formData.primary_color === color && (
                  <Ionicons name="checkmark" size={20} color="#fff" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Mensagens */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mensagens</Text>
          
          <Text style={styles.label}>Mensagem padrão do WhatsApp</Text>
          <TextInput
            style={[styles.input, { height: 100 }]}
            placeholder="Texto que aparece antes dos itens do pedido"
            placeholderTextColor="#9CA3AF"
            value={formData.whatsapp_message}
            onChangeText={(text) => setFormData({ ...formData, whatsapp_message: text })}
            multiline
            textAlignVertical="top"
          />
          
          <Text style={styles.label}>Mensagem de agradecimento</Text>
          <TextInput
            style={styles.input}
            placeholder="Obrigado pelo pedido!"
            placeholderTextColor="#9CA3AF"
            value={formData.thank_you_message}
            onChangeText={(text) => setFormData({ ...formData, thank_you_message: text })}
          />
        </View>

        <View style={{ height: 50 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  centerContent: { justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
  saveBtn: { padding: 8 },
  saveBtnText: { fontSize: 16, fontWeight: '600', color: '#3B82F6' },
  content: { flex: 1 },
  section: {
    backgroundColor: '#fff',
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 12 },
  label: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 6, marginTop: 12 },
  hint: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1F2937',
  },
  logoUpload: {
    width: 100,
    height: 100,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  logoImage: { width: '100%', height: '100%', borderRadius: 16 },
  logoText: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  switchLabel: { fontSize: 15, color: '#1F2937' },
  switchHint: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  row: { flexDirection: 'row', gap: 12 },
  halfInput: { flex: 1 },
  colorOptions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
});
