import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  Modal,
  Switch,
  RefreshControl,
  Platform,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const { width } = Dimensions.get('window');

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  promo_price?: number;
  image?: string;
  category_id: string;
  active: boolean;
  featured?: string;
  orders?: number;
  views?: number;
}

interface Category {
  id: string;
  name: string;
}

export default function ProductsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [restaurantId, setRestaurantId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteModal, setDeleteModal] = useState<{visible: boolean, product: Product | null}>({
    visible: false,
    product: null
  });
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    promo_price: '',
    category_id: '',
    image: '',
    active: true,
    featured: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await fetch(`${API_URL}/api/restaurants`);
      const data = await res.json();
      
      if (data.restaurants?.length > 0) {
        const restId = data.restaurants[0].id;
        setRestaurantId(restId);
        
        const [catRes, prodRes] = await Promise.all([
          fetch(`${API_URL}/api/restaurants/${restId}/categories`),
          fetch(`${API_URL}/api/restaurants/${restId}/products`),
        ]);
        
        const catData = await catRes.json();
        const prodData = await prodRes.json();
        
        setCategories(catData.categories || []);
        setProducts(prodData.products || []);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  const handleAddProduct = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      description: '',
      price: '',
      promo_price: '',
      category_id: categories[0]?.id || '',
      image: '',
      active: true,
      featured: '',
    });
    setModalVisible(true);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      promo_price: product.promo_price?.toString() || '',
      category_id: product.category_id,
      image: product.image || '',
      active: product.active,
      featured: product.featured || '',
    });
    setModalVisible(true);
  };

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.price || !formData.category_id) {
      showAlert('Erro', 'Preencha os campos obrigatórios');
      return;
    }

    const productData = {
      name: formData.name,
      description: formData.description,
      price: parseFloat(formData.price.replace(',', '.')),
      promo_price: formData.promo_price ? parseFloat(formData.promo_price.replace(',', '.')) : null,
      category_id: formData.category_id,
      restaurant_id: restaurantId,
      image: formData.image,
      active: formData.active,
      featured: formData.featured || null,
    };

    try {
      const url = editingProduct
        ? `${API_URL}/api/products/${editingProduct.id}`
        : `${API_URL}/api/products`;
      
      const res = await fetch(url, {
        method: editingProduct ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData),
      });

      if (res.ok) {
        showAlert('Sucesso', editingProduct ? 'Produto atualizado!' : 'Produto criado!');
        setModalVisible(false);
        loadData();
      }
    } catch (error) {
      showAlert('Erro', 'Falha ao salvar produto');
    }
  };

  const handleDelete = (product: Product) => {
    setDeleteModal({ visible: true, product });
  };

  const confirmDelete = async () => {
    const product = deleteModal.product;
    setDeleteModal({ visible: false, product: null });
    
    if (!product) return;
    
    try {
      const res = await fetch(`${API_URL}/api/products/${product.id}`, { method: 'DELETE' });
      if (res.ok) {
        showAlert('Sucesso', 'Produto excluído!');
        loadData();
      } else {
        showAlert('Erro', 'Falha ao excluir');
      }
    } catch (error) {
      showAlert('Erro', 'Falha ao excluir');
    }
  };

  const handleDuplicate = async (product: Product) => {
    try {
      const res = await fetch(`${API_URL}/api/products/${product.id}/duplicate`, { method: 'POST' });
      if (res.ok) {
        showAlert('Sucesso', 'Produto duplicado!');
        loadData();
      } else {
        showAlert('Erro', 'Falha ao duplicar');
      }
    } catch (error) {
      showAlert('Erro', 'Falha ao duplicar');
    }
  };

  const handleToggle = async (product: Product) => {
    try {
      await fetch(`${API_URL}/api/products/${product.id}/toggle`, { method: 'PATCH' });
      loadData();
    } catch (error) {
      showAlert('Erro', 'Falha ao alterar status');
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setFormData({ ...formData, image: `data:image/jpeg;base64,${result.assets[0].base64}` });
    }
  };

  const getCategoryName = (categoryId: string) => {
    return categories.find(c => c.id === categoryId)?.name || 'Sem categoria';
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !filterCategory || p.category_id === filterCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.push('/admin-dashboard')}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Produtos</Text>
          <Text style={styles.headerSubtitle}>{products.length} itens</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={handleAddProduct}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar produto..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category Filter */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.filtersScroll}
        contentContainerStyle={styles.filtersContent}
      >
        <TouchableOpacity
          style={[styles.filterPill, !filterCategory && styles.filterPillActive]}
          onPress={() => setFilterCategory(null)}
        >
          <Text style={[styles.filterText, !filterCategory && styles.filterTextActive]}>
            Todos ({products.length})
          </Text>
        </TouchableOpacity>
        {categories.map(cat => {
          const count = products.filter(p => p.category_id === cat.id).length;
          return (
            <TouchableOpacity
              key={cat.id}
              style={[styles.filterPill, filterCategory === cat.id && styles.filterPillActive]}
              onPress={() => setFilterCategory(cat.id)}
            >
              <Text style={[styles.filterText, filterCategory === cat.id && styles.filterTextActive]}>
                {cat.name} ({count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Products List */}
      <ScrollView
        style={styles.productsList}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {filteredProducts.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="restaurant-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyText}>Nenhum produto encontrado</Text>
          </View>
        ) : (
          filteredProducts.map(product => (
            <View key={product.id} style={styles.productCard}>
              {/* Main content */}
              <TouchableOpacity 
                style={styles.productMain}
                onPress={() => handleEditProduct(product)}
                activeOpacity={0.7}
              >
                {/* Image */}
                {product.image ? (
                  <Image source={{ uri: product.image }} style={styles.productImage} />
                ) : (
                  <View style={styles.productImagePlaceholder}>
                    <Ionicons name="image-outline" size={28} color="#D1D5DB" />
                  </View>
                )}
                
                {/* Info */}
                <View style={styles.productInfo}>
                  <View style={styles.productNameRow}>
                    <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
                    {product.featured && (
                      <Text style={styles.featuredEmoji}>
                        {product.featured === 'mais_vendido' ? '🔥' : product.featured === 'novo' ? '✨' : '⭐'}
                      </Text>
                    )}
                  </View>
                  
                  <Text style={styles.productCategory}>{getCategoryName(product.category_id)}</Text>
                  
                  {product.description && (
                    <Text style={styles.productDescription} numberOfLines={2}>
                      {product.description}
                    </Text>
                  )}
                  
                  <View style={styles.priceStatusRow}>
                    <View style={styles.priceContainer}>
                      {product.promo_price ? (
                        <>
                          <Text style={styles.oldPrice}>R$ {product.price.toFixed(2).replace('.', ',')}</Text>
                          <Text style={styles.promoPrice}>R$ {product.promo_price.toFixed(2).replace('.', ',')}</Text>
                        </>
                      ) : (
                        <Text style={styles.price}>R$ {product.price.toFixed(2).replace('.', ',')}</Text>
                      )}
                    </View>
                    
                    <View style={[styles.statusBadge, { backgroundColor: product.active ? '#D1FAE5' : '#FEE2E2' }]}>
                      <View style={[styles.statusDot, { backgroundColor: product.active ? '#10B981' : '#EF4444' }]} />
                      <Text style={[styles.statusText, { color: product.active ? '#059669' : '#DC2626' }]}>
                        {product.active ? 'Ativo' : 'Inativo'}
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
              
              {/* Actions */}
              <View style={styles.actionsRow}>
                <TouchableOpacity 
                  style={styles.actionButton} 
                  onPress={() => handleToggle(product)}
                >
                  <Ionicons 
                    name={product.active ? "eye-off-outline" : "eye-outline"} 
                    size={20} 
                    color="#6B7280" 
                  />
                  <Text style={styles.actionText}>
                    {product.active ? 'Desativar' : 'Ativar'}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => handleEditProduct(product)}
                >
                  <Ionicons name="pencil-outline" size={20} color="#3B82F6" />
                  <Text style={[styles.actionText, { color: '#3B82F6' }]}>Editar</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => handleDuplicate(product)}
                >
                  <Ionicons name="copy-outline" size={20} color="#6B7280" />
                  <Text style={styles.actionText}>Duplicar</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => handleDelete(product)}
                >
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                  <Text style={[styles.actionText, { color: '#EF4444' }]}>Excluir</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
        
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={handleAddProduct}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.cancelBtn}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingProduct ? 'Editar Produto' : 'Novo Produto'}
            </Text>
            <TouchableOpacity onPress={handleSave}>
              <Text style={styles.saveBtn}>Salvar</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Image */}
            <TouchableOpacity style={styles.imageUpload} onPress={pickImage}>
              {formData.image ? (
                <Image source={{ uri: formData.image }} style={styles.uploadedImage} />
              ) : (
                <View style={styles.uploadPlaceholder}>
                  <Ionicons name="camera-outline" size={36} color="#9CA3AF" />
                  <Text style={styles.uploadText}>Adicionar foto</Text>
                </View>
              )}
              <View style={styles.uploadOverlay}>
                <Ionicons name="camera" size={20} color="#fff" />
              </View>
            </TouchableOpacity>
            
            {/* Name */}
            <Text style={styles.label}>Nome do produto *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: X-Tudo Especial"
              placeholderTextColor="#9CA3AF"
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
            />
            
            {/* Description */}
            <Text style={styles.label}>Descrição</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Descreva os ingredientes e detalhes..."
              placeholderTextColor="#9CA3AF"
              value={formData.description}
              onChangeText={(text) => setFormData({ ...formData, description: text })}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            
            {/* Category */}
            <Text style={styles.label}>Categoria *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryPicker}>
              {categories.map(cat => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryOption,
                    formData.category_id === cat.id && styles.categoryOptionActive,
                  ]}
                  onPress={() => setFormData({ ...formData, category_id: cat.id })}
                >
                  <Text
                    style={[
                      styles.categoryOptionText,
                      formData.category_id === cat.id && styles.categoryOptionTextActive,
                    ]}
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            {/* Prices */}
            <View style={styles.priceRow}>
              <View style={styles.priceField}>
                <Text style={styles.label}>Preço *</Text>
                <View style={styles.priceInputWrapper}>
                  <Text style={styles.currencyPrefix}>R$</Text>
                  <TextInput
                    style={styles.priceInput}
                    placeholder="0,00"
                    placeholderTextColor="#9CA3AF"
                    value={formData.price}
                    onChangeText={(text) => setFormData({ ...formData, price: text })}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
              
              <View style={styles.priceField}>
                <Text style={styles.label}>Preço promocional</Text>
                <View style={styles.priceInputWrapper}>
                  <Text style={styles.currencyPrefix}>R$</Text>
                  <TextInput
                    style={styles.priceInput}
                    placeholder="0,00"
                    placeholderTextColor="#9CA3AF"
                    value={formData.promo_price}
                    onChangeText={(text) => setFormData({ ...formData, promo_price: text })}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
            </View>
            
            {/* Featured */}
            <Text style={styles.label}>Destaque</Text>
            <View style={styles.featuredOptions}>
              {[
                { value: '', label: 'Nenhum', icon: 'remove-circle-outline' },
                { value: 'mais_vendido', label: '🔥 Mais Vendido', icon: null },
                { value: 'recomendado', label: '⭐ Recomendado', icon: null },
                { value: 'novo', label: '✨ Novo', icon: null },
              ].map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.featuredOption,
                    formData.featured === opt.value && styles.featuredOptionActive,
                  ]}
                  onPress={() => setFormData({ ...formData, featured: opt.value })}
                >
                  <Text
                    style={[
                      styles.featuredOptionText,
                      formData.featured === opt.value && styles.featuredOptionTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            {/* Active */}
            <View style={styles.switchRow}>
              <View>
                <Text style={styles.switchLabel}>Produto ativo</Text>
                <Text style={styles.switchHint}>Visível no cardápio para os clientes</Text>
              </View>
              <Switch
                value={formData.active}
                onValueChange={(value) => setFormData({ ...formData, active: value })}
                trackColor={{ false: '#E5E7EB', true: '#BBF7D0' }}
                thumbColor={formData.active ? '#10B981' : '#9CA3AF'}
              />
            </View>
            
            <View style={{ height: 50 }} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#1F2937',
  },
  filtersScroll: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    maxHeight: 60,
  },
  filtersContent: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 4,
  },
  filterPillActive: {
    backgroundColor: '#3B82F6',
  },
  filterText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#fff',
  },
  productsList: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
  },
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  productMain: {
    flexDirection: 'row',
    padding: 16,
  },
  productImage: {
    width: 100,
    height: 100,
    borderRadius: 12,
  },
  productImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    flex: 1,
    marginLeft: 16,
  },
  productNameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  productName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
    lineHeight: 22,
  },
  featuredEmoji: {
    fontSize: 16,
    marginLeft: 6,
  },
  productCategory: {
    fontSize: 13,
    color: '#3B82F6',
    marginTop: 4,
    fontWeight: '500',
  },
  productDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 6,
    lineHeight: 20,
  },
  priceStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  price: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10B981',
  },
  oldPrice: {
    fontSize: 14,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
    marginRight: 8,
  },
  promoPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#EF4444',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#FAFAFA',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 6,
  },
  actionText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  cancelBtn: {
    fontSize: 16,
    color: '#6B7280',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  saveBtn: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  imageUpload: {
    width: 140,
    height: 140,
    borderRadius: 16,
    alignSelf: 'center',
    marginBottom: 24,
    position: 'relative',
  },
  uploadPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  uploadedImage: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  uploadText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
  },
  uploadOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1F2937',
  },
  textArea: {
    height: 100,
    paddingTop: 14,
  },
  categoryPicker: {
    marginTop: 4,
  },
  categoryOption: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 10,
  },
  categoryOptionActive: {
    backgroundColor: '#3B82F6',
  },
  categoryOptionText: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '500',
  },
  categoryOptionTextActive: {
    color: '#fff',
  },
  priceRow: {
    flexDirection: 'row',
    gap: 16,
  },
  priceField: {
    flex: 1,
  },
  priceInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingLeft: 14,
  },
  currencyPrefix: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  priceInput: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1F2937',
  },
  featuredOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  featuredOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  featuredOptionActive: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  featuredOptionText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  featuredOptionTextActive: {
    color: '#D97706',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  switchLabel: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
  },
  switchHint: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
});
