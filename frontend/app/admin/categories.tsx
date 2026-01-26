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

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface Category {
  id: string;
  name: string;
  order: number;
  active: boolean;
}

export default function CategoriesScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    try {
      const restaurantsRes = await fetch(`${API_URL}/api/restaurants`);
      const restaurantsData = await restaurantsRes.json();
      
      if (restaurantsData.restaurants && restaurantsData.restaurants.length > 0) {
        const restId = restaurantsData.restaurants[0].id;
        setRestaurantId(restId);

        const categoriesRes = await fetch(`${API_URL}/api/restaurants/${restId}/categories`);
        const categoriesData = await categoriesRes.json();
        setCategories(categoriesData.categories || []);
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

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Erro', 'Digite o nome da categoria');
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        // Update
        const res = await fetch(`${API_URL}/api/categories/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            restaurant_id: restaurantId,
            order: categories.length,
            active: true,
          }),
        });
        const result = await res.json();
        if (result.success) {
          Alert.alert('Sucesso', 'Categoria atualizada!');
        }
      } else {
        // Create
        const res = await fetch(`${API_URL}/api/categories`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            restaurant_id: restaurantId,
            order: categories.length + 1,
            active: true,
          }),
        });
        const result = await res.json();
        if (result.success) {
          Alert.alert('Sucesso', 'Categoria criada!');
        }
      }
      setName('');
      setEditingId(null);
      setShowForm(false);
      loadData();
    } catch (error) {
      Alert.alert('Erro', 'Falha ao salvar categoria');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (category: Category) => {
    setEditingId(category.id);
    setName(category.name);
    setShowForm(true);
  };

  const handleDelete = (categoryId: string, categoryName: string) => {
    Alert.alert(
      'Confirmar',
      `Deseja deletar a categoria "${categoryName}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Deletar',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await fetch(`${API_URL}/api/categories/${categoryId}`, {
                method: 'DELETE',
              });
              const result = await res.json();
              if (result.success) {
                Alert.alert('Sucesso', 'Categoria deletada!');
                loadData();
              } else {
                Alert.alert('Erro', result.detail || 'Não foi possível deletar');
              }
            } catch (error) {
              Alert.alert('Erro', 'Falha ao deletar categoria');
              console.error(error);
            }
          },
        },
      ]
    );
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
      <View style={[styles.container, { backgroundColor: isDark ? '#000' : '#f5f5f5' }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.push('/(tabs)/admin')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={isDark ? '#fff' : '#000'} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: isDark ? '#fff' : '#000' }]}>Categorias</Text>
          <TouchableOpacity
            onPress={() => {
              setEditingId(null);
              setName('');
              setShowForm(!showForm);
            }}
            style={styles.addButton}
          >
            <Ionicons name={showForm ? 'close' : 'add'} size={24} color="#FF6B35" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
          {showForm && (
            <View style={[styles.card, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
              <Text style={[styles.cardTitle, { color: isDark ? '#fff' : '#000' }]}>
                {editingId ? 'Editar Categoria' : 'Nova Categoria'}
              </Text>
              
              <TextInput
                style={[styles.input, { backgroundColor: isDark ? '#000' : '#f9f9f9', color: isDark ? '#fff' : '#000' }]}
                placeholder="Nome da categoria"
                placeholderTextColor={isDark ? '#666' : '#999'}
                value={name}
                onChangeText={setName}
              />
              
              <TouchableOpacity
                style={[styles.primaryButton, { opacity: saving ? 0.5 : 1 }]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    {editingId ? 'Atualizar' : 'Criar Categoria'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          <View style={[styles.card, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
            <Text style={[styles.cardTitle, { color: isDark ? '#fff' : '#000' }]}>
              Categorias Cadastradas ({categories.length})
            </Text>

            {categories.length === 0 ? (
              <Text style={[styles.emptyText, { color: isDark ? '#aaa' : '#666' }]}>
                Nenhuma categoria cadastrada
              </Text>
            ) : (
              categories.map((category) => (
                <View key={category.id} style={styles.categoryItem}>
                  <View style={styles.categoryInfo}>
                    <Ionicons name="grid" size={20} color="#FF6B35" />
                    <Text style={[styles.categoryName, { color: isDark ? '#fff' : '#000' }]}>
                      {category.name}
                    </Text>
                  </View>
                  <View style={styles.categoryActions}>
                    <TouchableOpacity
                      onPress={() => handleEdit(category)}
                      style={styles.actionButton}
                    >
                      <Ionicons name="pencil" size={20} color="#4CAF50" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDelete(category.id, category.name)}
                      style={styles.actionButton}
                    >
                      <Ionicons name="trash" size={20} color="#F44336" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
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
  addButton: {
    width: 40,
    alignItems: 'flex-end',
  },
  content: {
    flex: 1,
    padding: 16,
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
  emptyText: {
    textAlign: 'center',
    fontSize: 14,
    marginTop: 8,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    marginLeft: 12,
    fontWeight: '600',
  },
  categoryActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
});
