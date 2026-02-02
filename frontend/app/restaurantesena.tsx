import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  useColorScheme,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCartStore } from '../store/cartStore';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const { width } = Dimensions.get('window');

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image?: string;
  category_id: string;
  is_available: boolean;
  is_featured?: boolean;
  tags?: string[];
}

interface Category {
  id: string;
  name: string;
  order: number;
}

interface Restaurant {
  id: string;
  name: string;
  description?: string;
  logo?: string;
  address?: string;
  whatsapp?: string;
  primary_color?: string;
  opening_hours?: string;
}

export default function MenuScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const [restaurant, setRestaurant] = useState<Restaurant>({} as Restaurant);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(true);
  
  const { addItem, getTotalItems, getTotalPrice } = useCartStore();
  const scrollY = useRef(new Animated.Value(0)).current;
  const feedbackAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadData();
    checkOpenStatus();
  }, []);

  const checkOpenStatus = () => {
    const now = new Date();
    const hours = now.getHours();
    setIsOpen(hours >= 11 && hours < 22);
  };

  const loadData = async () => {
    try {
      const resRestaurant = await fetch(`${API_URL}/api/restaurants`);
      const dataRestaurant = await resRestaurant.json();
      
      if (dataRestaurant.restaurants?.length > 0) {
        const rest = dataRestaurant.restaurants[0];
        setRestaurant(rest);
        
        const [resCat, resProd] = await Promise.all([
          fetch(`${API_URL}/api/restaurants/${rest.id}/categories`),
          fetch(`${API_URL}/api/restaurants/${rest.id}/products`)
        ]);
        
        const dataCat = await resCat.json();
        const dataProd = await resProd.json();
        
        setCategories(dataCat.categories || []);
        setProducts(dataProd.products || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  const addToCart = (product: Product) => {
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      quantity: 1,
    });
    
    // Feedback animation
    Animated.sequence([
      Animated.timing(feedbackAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(feedbackAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
  };

  const filteredProducts = selectedCategory
    ? products.filter(p => p.category_id === selectedCategory)
    : products;

  const groupedProducts = categories.reduce((acc, category) => {
    const categoryProducts = filteredProducts.filter(p => p.category_id === category.id);
    if (categoryProducts.length > 0) {
      acc[category.name] = categoryProducts;
    }
    return acc;
  }, {} as Record<string, Product[]>);

  const primaryColor = restaurant.primary_color || '#E63946';

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: '#fff' }]}>
        <ActivityIndicator size="large" color={primaryColor} />
        <Text style={styles.loadingText}>Carregando cardápio...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header fixo */}
      <View style={[styles.header, { backgroundColor: primaryColor }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <View style={styles.logoContainer}>
              {restaurant.logo ? (
                <Image source={{ uri: restaurant.logo }} style={styles.logo} />
              ) : (
                <Text style={styles.logoText}>{restaurant.name?.charAt(0) || 'S'}</Text>
              )}
            </View>
            <View style={styles.headerInfo}>
              <Text style={styles.restaurantName}>{restaurant.name}</Text>
              <View style={styles.statusContainer}>
                <View style={[styles.statusDot, { backgroundColor: isOpen ? '#4ADE80' : '#EF4444' }]} />
                <Text style={styles.statusText}>{isOpen ? 'Aberto agora' : 'Fechado'}</Text>
                {restaurant.opening_hours && (
                  <Text style={styles.hoursText}> • {restaurant.opening_hours}</Text>
                )}
              </View>
            </View>
          </View>
          
          {/* Botão Admin (discreto) */}
          <TouchableOpacity 
            style={styles.adminBtn}
            onPress={() => router.push('/admin-login')}
          >
            <Ionicons name="settings-outline" size={20} color="rgba(255,255,255,0.5)" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={primaryColor} />}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
        scrollEventThrottle={16}
      >
        {/* Banner de info */}
        <View style={styles.infoBanner}>
          <View style={styles.infoItem}>
            <Ionicons name="time-outline" size={18} color="#666" />
            <Text style={styles.infoText}>30-45 min</Text>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoItem}>
            <Ionicons name="bicycle-outline" size={18} color="#666" />
            <Text style={styles.infoText}>Delivery</Text>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoItem}>
            <Ionicons name="wallet-outline" size={18} color="#666" />
            <Text style={styles.infoText}>Pedido mín. R$ 10</Text>
          </View>
        </View>

        {/* Filtros de categoria */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.categoriesScroll}
          contentContainerStyle={styles.categoriesContent}
        >
          <TouchableOpacity
            style={[styles.categoryPill, !selectedCategory && { backgroundColor: primaryColor }]}
            onPress={() => setSelectedCategory(null)}
          >
            <Text style={[styles.categoryPillText, !selectedCategory && { color: '#fff' }]}>
              Todos
            </Text>
          </TouchableOpacity>
          {categories.map(cat => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.categoryPill, selectedCategory === cat.id && { backgroundColor: primaryColor }]}
              onPress={() => setSelectedCategory(cat.id)}
            >
              <Text style={[styles.categoryPillText, selectedCategory === cat.id && { color: '#fff' }]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Lista de produtos */}
        {Object.entries(groupedProducts).map(([categoryName, categoryProducts]) => (
          <View key={categoryName} style={styles.categorySection}>
            <Text style={styles.categoryTitle}>{categoryName}</Text>
            
            {categoryProducts.map(product => (
              <TouchableOpacity
                key={product.id}
                style={styles.productCard}
                onPress={() => addToCart(product)}
                activeOpacity={0.7}
              >
                <View style={styles.productInfo}>
                  <View style={styles.productHeader}>
                    <Text style={styles.productName}>{product.name}</Text>
                    {product.tags?.includes('mais_vendido') && (
                      <View style={[styles.tag, { backgroundColor: '#FEF3C7' }]}>
                        <Text style={[styles.tagText, { color: '#D97706' }]}>🔥 Top</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.productDescription} numberOfLines={2}>
                    {product.description}
                  </Text>
                  <View style={styles.productFooter}>
                    <Text style={[styles.productPrice, { color: primaryColor }]}>
                      R$ {product.price.toFixed(2).replace('.', ',')}
                    </Text>
                    <View style={[styles.addBtn, { backgroundColor: primaryColor }]}>
                      <Ionicons name="add" size={20} color="#fff" />
                    </View>
                  </View>
                </View>
                
                {product.image && (
                  <Image source={{ uri: product.image }} style={styles.productImage} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        ))}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Carrinho flutuante */}
      {getTotalItems() > 0 && (
        <Animated.View 
          style={[
            styles.floatingCart,
            { 
              backgroundColor: primaryColor,
              transform: [{ scale: feedbackAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] }) }]
            }
          ]}
        >
          <TouchableOpacity
            style={styles.floatingCartContent}
            onPress={() => router.push('/cart')}
          >
            <View style={styles.cartLeft}>
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{getTotalItems()}</Text>
              </View>
              <Text style={styles.cartText}>Ver carrinho</Text>
            </View>
            <Text style={styles.cartTotal}>R$ {getTotalPrice().toFixed(2).replace('.', ',')}</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logoContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 10,
  },
  logoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#E63946',
  },
  headerInfo: {
    flex: 1,
  },
  restaurantName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
  hoursText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
  },
  adminBtn: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  infoBanner: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  infoText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 6,
    fontWeight: '500',
  },
  infoDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#E5E7EB',
  },
  categoriesScroll: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  categoriesContent: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  categoryPillText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  categorySection: {
    paddingTop: 20,
    paddingHorizontal: 16,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  productCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  productInfo: {
    flex: 1,
    marginRight: 12,
  },
  productHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  productDescription: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 8,
  },
  productFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  productPrice: {
    fontSize: 17,
    fontWeight: 'bold',
  },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productImage: {
    width: 90,
    height: 90,
    borderRadius: 8,
  },
  floatingCart: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  floatingCartContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  cartLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cartBadge: {
    backgroundColor: '#fff',
    borderRadius: 10,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  cartBadgeText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#E63946',
  },
  cartText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  cartTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});
