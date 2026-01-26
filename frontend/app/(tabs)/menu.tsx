import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Linking,
  RefreshControl,
  ActivityIndicator,
  useColorScheme,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCartStore } from '../../store/cartStore';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const { width } = Dimensions.get('window');

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image?: string;
  badges: string[];
  category_id: string;
  active: boolean;
}

interface Category {
  id: string;
  name: string;
  icon?: string;
}

interface Restaurant {
  id: string;
  name: string;
  logo?: string;
  whatsapp: string;
  primary_color: string;
  secondary_color: string;
  description?: string;
  address?: string;
}

export default function MenuScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const { addItem, getTotalItems } = useCartStore();

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const restaurantsRes = await fetch(`${API_URL}/api/restaurants`);
      const restaurantsData = await restaurantsRes.json();
      
      if (restaurantsData.restaurants && restaurantsData.restaurants.length > 0) {
        const rest = restaurantsData.restaurants[0];
        setRestaurant(rest);

        const categoriesRes = await fetch(`${API_URL}/api/restaurants/${rest.id}/categories`);
        const categoriesData = await categoriesRes.json();
        setCategories(categoriesData.categories || []);

        const productsRes = await fetch(`${API_URL}/api/restaurants/${rest.id}/products`);
        const productsData = await productsRes.json();
        setProducts(productsData.products || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const getBadgeIcon = (badge: string) => {
    switch (badge) {
      case 'mais_pedido':
        return 'flame';
      case 'escolha_inteligente':
        return 'star';
      case 'compartilhar':
        return 'people';
      default:
        return 'checkmark-circle';
    }
  };

  const getBadgeText = (badge: string) => {
    switch (badge) {
      case 'mais_pedido':
        return 'Mais pedido';
      case 'escolha_inteligente':
        return 'Escolha inteligente';
      case 'compartilhar':
        return 'Perfeito para compartilhar';
      default:
        return '';
    }
  };

  const getBadgeColor = (badge: string) => {
    switch (badge) {
      case 'mais_pedido':
        return '#FF6B35';
      case 'escolha_inteligente':
        return '#ffea07';
      case 'compartilhar':
        return '#4CAF50';
      default:
        return '#999';
    }
  };

  const orderOnWhatsApp = (product: Product) => {
    if (!restaurant) return;
    
    const message = `Olá! Gostaria de pedir:\n\n*${product.name}*\nValor: R$ ${product.price.toFixed(2)}\n\nObrigado!`;
    const whatsappUrl = `https://wa.me/${restaurant.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    
    Linking.openURL(whatsappUrl);
  };

  const filteredProducts = selectedCategory
    ? products.filter(p => p.category_id === selectedCategory && p.active)
    : products.filter(p => p.active);

  // Separar produtos com badges "mais_pedido" para destaque
  const featuredProducts = filteredProducts.filter(p => p.badges.includes('mais_pedido'));
  const regularProducts = filteredProducts.filter(p => !p.badges.includes('mais_pedido'));

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: isDark ? '#000' : '#fff' }]}>
        <ActivityIndicator size="large" color="#ffea07" />
        <Text style={[styles.loadingText, { color: isDark ? '#fff' : '#000' }]}>Carregando cardápio...</Text>
      </View>
    );
  }

  if (!restaurant) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: isDark ? '#000' : '#fff' }]}>
        <Ionicons name="restaurant-outline" size={64} color="#ccc" />
        <Text style={[styles.emptyText, { color: isDark ? '#fff' : '#666' }]}>Nenhum restaurante encontrado</Text>
        <Text style={[styles.emptySubtext, { color: isDark ? '#aaa' : '#999' }]}>Configure seu primeiro restaurante no Admin</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#000' : '#f5f5f5' }]}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Compacto */}
        <View style={[styles.headerCompact, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
          <View style={styles.headerTop}>
            <View style={styles.restaurantInfo}>
              {restaurant.logo ? (
                <Image source={{ uri: restaurant.logo }} style={styles.logoSmall} />
              ) : (
                <View style={styles.logoPlaceholderSmall}>
                  <Ionicons name="restaurant" size={20} color="#ffea07" />
                </View>
              )}
              <View style={styles.restaurantDetails}>
                <Text style={[styles.restaurantNameSmall, { color: isDark ? '#fff' : '#000' }]} numberOfLines={1}>
                  {restaurant.name}
                </Text>
                {restaurant.address && (
                  <Text style={[styles.restaurantAddress, { color: isDark ? '#aaa' : '#666' }]} numberOfLines={1}>
                    {restaurant.address}
                  </Text>
                )}
              </View>
            </View>
          </View>
          
          {/* Info Bar */}
          <View style={styles.infoBar}>
            <View style={styles.infoItem}>
              <Ionicons name="time-outline" size={16} color="#4CAF50" />
              <Text style={[styles.infoText, { color: isDark ? '#fff' : '#000' }]}>Delivery rápido</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoItem}>
              <Ionicons name="cart-outline" size={16} color="#4CAF50" />
              <Text style={[styles.infoText, { color: isDark ? '#fff' : '#000' }]}>Sem pedido mínimo</Text>
            </View>
          </View>
        </View>

        {/* Categories Filter Pills */}
        {categories.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoriesContainer}
            contentContainerStyle={styles.categoriesContent}
          >
            <TouchableOpacity
              style={[
                styles.categoryPill,
                !selectedCategory && styles.categoryPillActive,
                { 
                  backgroundColor: !selectedCategory ? '#ffea07' : (isDark ? '#1a1a1a' : '#fff'),
                  borderColor: !selectedCategory ? '#ffea07' : '#ddd',
                }
              ]}
              onPress={() => setSelectedCategory(null)}
            >
              <Text style={[
                styles.categoryPillText,
                { color: !selectedCategory ? '#000' : (isDark ? '#fff' : '#666') }
              ]}>
                Todos
              </Text>
            </TouchableOpacity>
            {categories.map(cat => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryPill,
                  selectedCategory === cat.id && styles.categoryPillActive,
                  { 
                    backgroundColor: selectedCategory === cat.id ? '#ffea07' : (isDark ? '#1a1a1a' : '#fff'),
                    borderColor: selectedCategory === cat.id ? '#ffea07' : '#ddd',
                  }
                ]}
                onPress={() => setSelectedCategory(cat.id)}
              >
                <Text style={[
                  styles.categoryPillText,
                  { color: selectedCategory === cat.id ? '#000' : (isDark ? '#fff' : '#666') }
                ]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Produtos em Destaque - Horizontal Scroll */}
        {featuredProducts.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: isDark ? '#fff' : '#000' }]}>
              🔥 Mais Pedidos
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.featuredScrollContent}
            >
              {featuredProducts.map(product => (
                <TouchableOpacity
                  key={product.id}
                  style={[styles.featuredCard, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}
                  onPress={() => orderOnWhatsApp(product)}
                >
                  {product.image ? (
                    <Image source={{ uri: product.image }} style={styles.featuredImage} />
                  ) : (
                    <View style={styles.featuredImagePlaceholder}>
                      <Ionicons name="image-outline" size={40} color="#ccc" />
                    </View>
                  )}
                  
                  {/* Badge Destaque */}
                  <View style={styles.featuredBadge}>
                    <Ionicons name="flame" size={14} color="#fff" />
                    <Text style={styles.featuredBadgeText}>Favorito!</Text>
                  </View>

                  <View style={styles.featuredInfo}>
                    <Text style={[styles.featuredName, { color: isDark ? '#fff' : '#000' }]} numberOfLines={2}>
                      {product.name}
                    </Text>
                    <Text style={styles.featuredPrice}>R$ {product.price.toFixed(2)}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Produtos Regulares - Grid Vertical */}
        <View style={styles.productsGrid}>
          {regularProducts.length === 0 && featuredProducts.length === 0 ? (
            <View style={styles.emptyProducts}>
              <Ionicons name="fast-food-outline" size={48} color="#ccc" />
              <Text style={[styles.emptyText, { color: isDark ? '#fff' : '#666' }]}>Nenhum produto encontrado</Text>
            </View>
          ) : (
            regularProducts.map(product => (
              <View key={product.id} style={[styles.productCard, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
                {product.image && (
                  <Image source={{ uri: product.image }} style={styles.productImage} />
                )}

                <View style={styles.productContent}>
                  {/* Badges */}
                  {product.badges && product.badges.length > 0 && (
                    <View style={styles.badgesRow}>
                      {product.badges.map((badge, idx) => (
                        <View key={idx} style={[styles.badge, { borderColor: getBadgeColor(badge) }]}>
                          <Ionicons name={getBadgeIcon(badge)} size={12} color={getBadgeColor(badge)} />
                          <Text style={[styles.badgeText, { color: getBadgeColor(badge) }]}>
                            {getBadgeText(badge)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                  
                  <Text style={[styles.productName, { color: isDark ? '#fff' : '#000' }]}>{product.name}</Text>
                  <Text style={[styles.productDescription, { color: isDark ? '#aaa' : '#666' }]} numberOfLines={2}>
                    {product.description}
                  </Text>
                  
                  <View style={styles.productFooter}>
                    <Text style={styles.productPrice}>R$ {product.price.toFixed(2)}</Text>
                    <TouchableOpacity
                      style={styles.orderButton}
                      onPress={() => orderOnWhatsApp(product)}
                    >
                      <Ionicons name="logo-whatsapp" size={18} color="#fff" />
                      <Text style={styles.orderButtonText}>Pedir</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Footer Spacing */}
        <View style={{ height: 100 }} />
      </ScrollView>
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
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  headerCompact: {
    paddingTop: 50,
    paddingBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTop: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  restaurantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  logoPlaceholderSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  restaurantDetails: {
    flex: 1,
  },
  restaurantNameSmall: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  restaurantAddress: {
    fontSize: 12,
  },
  infoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  infoText: {
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '600',
  },
  infoDivider: {
    width: 1,
    height: 16,
    backgroundColor: '#ddd',
  },
  categoriesContainer: {
    backgroundColor: 'transparent',
    paddingVertical: 16,
  },
  categoriesContent: {
    paddingHorizontal: 16,
  },
  categoryPill: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 2,
  },
  categoryPillActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryPillText: {
    fontSize: 14,
    fontWeight: '700',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  featuredScrollContent: {
    paddingHorizontal: 16,
  },
  featuredCard: {
    width: 160,
    borderRadius: 16,
    marginRight: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  featuredImage: {
    width: '100%',
    height: 140,
    resizeMode: 'cover',
  },
  featuredImagePlaceholder: {
    width: '100%',
    height: 140,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featuredBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#FF6B35',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  featuredBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  featuredInfo: {
    padding: 12,
  },
  featuredName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  featuredPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffea07',
  },
  productsGrid: {
    paddingHorizontal: 16,
  },
  emptyProducts: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
  },
  productCard: {
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  productImage: {
    width: '100%',
    height: 180,
    resizeMode: 'cover',
  },
  productContent: {
    padding: 16,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 4,
  },
  productName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  productDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffea07',
  },
  orderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#25D366',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  orderButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
    marginLeft: 6,
  },
});
