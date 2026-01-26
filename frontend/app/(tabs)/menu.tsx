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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image?: string;
  badges: string[];
  category_id: string;
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
}

export default function MenuScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const loadData = async () => {
    try {
      // For MVP, we'll use the first restaurant
      // In production, this would come from URL params or user selection
      const restaurantsRes = await fetch(`${API_URL}/api/restaurants`);
      const restaurantsData = await restaurantsRes.json();
      
      if (restaurantsData.restaurants && restaurantsData.restaurants.length > 0) {
        const rest = restaurantsData.restaurants[0];
        setRestaurant(rest);

        // Load categories
        const categoriesRes = await fetch(`${API_URL}/api/restaurants/${rest.id}/categories`);
        const categoriesData = await categoriesRes.json();
        setCategories(categoriesData.categories || []);

        // Load products
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
        return '🔥';
      case 'escolha_inteligente':
        return '⭐';
      case 'compartilhar':
        return '👥';
      default:
        return '';
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

  const orderOnWhatsApp = (product: Product) => {
    if (!restaurant) return;
    
    const message = `Olá! Gostaria de pedir:\n\n*${product.name}*\nValor: R$ ${product.price.toFixed(2)}\n\nObrigado!`;
    const whatsappUrl = `https://wa.me/${restaurant.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    
    Linking.openURL(whatsappUrl);
  };

  const filteredProducts = selectedCategory
    ? products.filter(p => p.category_id === selectedCategory && p.active)
    : products.filter(p => p.active);

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: isDark ? '#000' : '#fff' }]}>
        <ActivityIndicator size="large" color="#FF6B35" />
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
        {/* Header */}
        <View style={[styles.header, { backgroundColor: restaurant.primary_color }]}>
          {restaurant.logo ? (
            <Image source={{ uri: restaurant.logo }} style={styles.logo} />
          ) : (
            <View style={styles.logoPlaceholder}>
              <Ionicons name="restaurant" size={32} color="#fff" />
            </View>
          )}
          <Text style={styles.restaurantName}>{restaurant.name}</Text>
          {restaurant.description && (
            <Text style={styles.restaurantDescription}>{restaurant.description}</Text>
          )}
        </View>

        {/* Categories Filter */}
        {categories.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoriesContainer}
            contentContainerStyle={styles.categoriesContent}
          >
            <TouchableOpacity
              style={[
                styles.categoryChip,
                !selectedCategory && styles.categoryChipActive,
                { backgroundColor: !selectedCategory ? restaurant.primary_color : (isDark ? '#1a1a1a' : '#fff') }
              ]}
              onPress={() => setSelectedCategory(null)}
            >
              <Text style={[styles.categoryChipText, !selectedCategory && styles.categoryChipTextActive]}>
                Todos
              </Text>
            </TouchableOpacity>
            {categories.map(cat => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryChip,
                  selectedCategory === cat.id && styles.categoryChipActive,
                  { backgroundColor: selectedCategory === cat.id ? restaurant.primary_color : (isDark ? '#1a1a1a' : '#fff') }
                ]}
                onPress={() => setSelectedCategory(cat.id)}
              >
                <Text style={[styles.categoryChipText, selectedCategory === cat.id && styles.categoryChipTextActive]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Products */}
        <View style={styles.productsContainer}>
          {filteredProducts.length === 0 ? (
            <View style={styles.emptyProducts}>
              <Ionicons name="fast-food-outline" size={48} color="#ccc" />
              <Text style={[styles.emptyText, { color: isDark ? '#fff' : '#666' }]}>Nenhum produto encontrado</Text>
            </View>
          ) : (
            filteredProducts.map(product => (
              <View key={product.id} style={[styles.productCard, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
                {product.image && (
                  <Image source={{ uri: product.image }} style={styles.productImage} />
                )}

                <View style={styles.productInfo}>
                  {/* Badges */}
                  {product.badges && product.badges.length > 0 && (
                    <View style={styles.badgesContainer}>
                      {product.badges.map((badge, idx) => (
                        <View key={idx} style={styles.badge}>
                          <Text style={styles.badgeText}>
                            {getBadgeIcon(badge)} {getBadgeText(badge)}
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
                    <Text style={[styles.productPrice, { color: restaurant.primary_color }]}>R$ {product.price.toFixed(2)}</Text>
                    <TouchableOpacity
                      style={[styles.orderButton, { backgroundColor: '#25D366' }]}
                      onPress={() => orderOnWhatsApp(product)}
                    >
                      <Ionicons name="logo-whatsapp" size={20} color="#fff" />
                      <Text style={styles.orderButtonText}>Pedir</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
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
  header: {
    padding: 24,
    paddingTop: 60,
    paddingBottom: 32,
    alignItems: 'center',
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 16,
  },
  logoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  restaurantName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  restaurantDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
  },
  categoriesContainer: {
    backgroundColor: 'transparent',
    paddingVertical: 16,
    marginBottom: 8,
  },
  categoriesContent: {
    paddingHorizontal: 16,
  },
  categoryChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  categoryChipActive: {
    borderColor: 'transparent',
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  categoryChipTextActive: {
    color: '#fff',
  },
  productsContainer: {
    padding: 16,
    paddingBottom: 100,
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
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  productImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  badgesContainer: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badge: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  productInfo: {
    padding: 16,
  },
  productName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
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
  },
  orderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  orderButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});
