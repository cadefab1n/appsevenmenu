import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Platform,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const { width } = Dimensions.get('window');

interface DashboardData {
  today: {
    orders: number;
    revenue: number;
    avg_ticket: number;
    peak_hour: string;
  };
  comparison: {
    revenue_growth: number;
    orders_growth: number;
  };
  funnel: {
    page_views: number;
    cart_adds: number;
    checkout_clicks: number;
    orders_sent: number;
  };
  top_products: Array<{ name: string; orders: number; revenue: number }>;
}

export default function AdminDashboard() {
  const router = useRouter();
  const { user, restaurant, token, isLoading: authLoading, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [stats, setStats] = useState({ products: 0, categories: 0, combos: 0 });

  useEffect(() => {
    if (!authLoading) {
      if (!token || !user) {
        router.replace('/login');
        return;
      }
      loadData();
    }
  }, [authLoading, token, user]);

  const loadData = async () => {
    if (!token || !restaurant) {
      setLoading(false);
      return;
    }
    
    try {
      // Load stats with authentication
      const headers = { Authorization: `Bearer ${token}` };
      
      const [catRes, prodRes, dashRes] = await Promise.all([
        fetch(`${API_URL}/api/categories`, { headers }),
        fetch(`${API_URL}/api/products`, { headers }),
        fetch(`${API_URL}/api/analytics/dashboard`, { headers }),
      ]);
      
      const catData = await catRes.json();
      const prodData = await prodRes.json();
      const dashData = await dashRes.json();
      
      setStats({
        categories: catData.categories?.length || 0,
        products: prodData.products?.length || 0,
        combos: 0,
      });
      
      if (dashData.success) {
        setDashboard(dashData.dashboard);
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
  }, [token, restaurant]);

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  const menuItems = [
    { icon: 'restaurant-outline', label: 'Produtos', route: '/admin/products', color: '#3B82F6', count: stats.products },
    { icon: 'grid-outline', label: 'Categorias', route: '/admin/categories', color: '#8B5CF6', count: stats.categories },
    { icon: 'pricetag-outline', label: 'Promoções', route: '/admin/promotions', color: '#F59E0B', count: 0 },
    { icon: 'layers-outline', label: 'Combos', route: '/admin/combos', color: '#10B981', count: stats.combos },
    { icon: 'settings-outline', label: 'Configurações', route: '/admin/settings', color: '#6B7280', count: null },
    { icon: 'qr-code-outline', label: 'QR Code', route: '/admin/qrcode', color: '#EC4899', count: null },
  ];

  const formatCurrency = (value: number) => `R$ ${value.toFixed(2).replace('.', ',')}`;
  const formatPercent = (value: number) => `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;

  if (loading || authLoading) {
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
        <View>
          <Text style={styles.greeting}>Painel Admin</Text>
          <Text style={styles.restaurantName}>{restaurantName}</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => router.push('/restaurantesena')}>
            <Ionicons name="eye-outline" size={22} color="#6B7280" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={22} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* KPIs - Visão Geral */}
        <Text style={styles.sectionTitle}>📊 Hoje</Text>
        <View style={styles.kpiGrid}>
          <View style={[styles.kpiCard, { backgroundColor: '#EFF6FF' }]}>
            <Ionicons name="receipt-outline" size={24} color="#3B82F6" />
            <Text style={styles.kpiValue}>{dashboard?.today.orders || 0}</Text>
            <Text style={styles.kpiLabel}>Pedidos</Text>
            {dashboard?.comparison.orders_growth !== 0 && (
              <View style={[styles.badge, { backgroundColor: dashboard?.comparison.orders_growth > 0 ? '#D1FAE5' : '#FEE2E2' }]}>
                <Text style={[styles.badgeText, { color: dashboard?.comparison.orders_growth > 0 ? '#059669' : '#DC2626' }]}>
                  {formatPercent(dashboard?.comparison.orders_growth || 0)}
                </Text>
              </View>
            )}
          </View>
          
          <View style={[styles.kpiCard, { backgroundColor: '#F0FDF4' }]}>
            <Ionicons name="cash-outline" size={24} color="#10B981" />
            <Text style={styles.kpiValue}>{formatCurrency(dashboard?.today.revenue || 0)}</Text>
            <Text style={styles.kpiLabel}>Faturamento</Text>
            {dashboard?.comparison.revenue_growth !== 0 && (
              <View style={[styles.badge, { backgroundColor: dashboard?.comparison.revenue_growth > 0 ? '#D1FAE5' : '#FEE2E2' }]}>
                <Text style={[styles.badgeText, { color: dashboard?.comparison.revenue_growth > 0 ? '#059669' : '#DC2626' }]}>
                  {formatPercent(dashboard?.comparison.revenue_growth || 0)}
                </Text>
              </View>
            )}
          </View>
          
          <View style={[styles.kpiCard, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="ticket-outline" size={24} color="#F59E0B" />
            <Text style={styles.kpiValue}>{formatCurrency(dashboard?.today.avg_ticket || 0)}</Text>
            <Text style={styles.kpiLabel}>Ticket Médio</Text>
          </View>
          
          <View style={[styles.kpiCard, { backgroundColor: '#FDF2F8' }]}>
            <Ionicons name="time-outline" size={24} color="#EC4899" />
            <Text style={styles.kpiValue}>{dashboard?.today.peak_hour || '12:00'}</Text>
            <Text style={styles.kpiLabel}>Pico</Text>
          </View>
        </View>

        {/* Funil de Conversão */}
        <Text style={styles.sectionTitle}>🎯 Funil de Conversão</Text>
        <View style={styles.funnelCard}>
          <View style={styles.funnelGrid}>
            <View style={styles.funnelItem}>
              <View style={[styles.funnelIconBox, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="eye-outline" size={20} color="#3B82F6" />
              </View>
              <Text style={styles.funnelNumber}>{dashboard?.funnel.page_views || 0}</Text>
              <Text style={styles.funnelLabel}>Visualizações</Text>
            </View>
            
            <View style={styles.funnelArrow}>
              <Ionicons name="arrow-forward" size={16} color="#D1D5DB" />
            </View>
            
            <View style={styles.funnelItem}>
              <View style={[styles.funnelIconBox, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="cart-outline" size={20} color="#F59E0B" />
              </View>
              <Text style={styles.funnelNumber}>{dashboard?.funnel.cart_adds || 0}</Text>
              <Text style={styles.funnelLabel}>Carrinho</Text>
            </View>
            
            <View style={styles.funnelArrow}>
              <Ionicons name="arrow-forward" size={16} color="#D1D5DB" />
            </View>
            
            <View style={styles.funnelItem}>
              <View style={[styles.funnelIconBox, { backgroundColor: '#F3E8FF' }]}>
                <Ionicons name="card-outline" size={20} color="#8B5CF6" />
              </View>
              <Text style={styles.funnelNumber}>{dashboard?.funnel.checkout_clicks || 0}</Text>
              <Text style={styles.funnelLabel}>Checkout</Text>
            </View>
            
            <View style={styles.funnelArrow}>
              <Ionicons name="arrow-forward" size={16} color="#D1D5DB" />
            </View>
            
            <View style={styles.funnelItem}>
              <View style={[styles.funnelIconBox, { backgroundColor: '#D1FAE5' }]}>
                <Ionicons name="checkmark-circle-outline" size={20} color="#10B981" />
              </View>
              <Text style={[styles.funnelNumber, { color: '#10B981' }]}>{dashboard?.funnel.orders_sent || 0}</Text>
              <Text style={styles.funnelLabel}>Pedidos</Text>
            </View>
          </View>
        </View>

        {/* Top Produtos */}
        {dashboard?.top_products && dashboard.top_products.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>🏆 Mais Vendidos</Text>
            <View style={styles.topProductsCard}>
              {dashboard.top_products.map((product, index) => (
                <View key={index} style={styles.topProductRow}>
                  <View style={styles.topProductRank}>
                    <Text style={styles.rankNumber}>{index + 1}º</Text>
                  </View>
                  <View style={styles.topProductInfo}>
                    <Text style={styles.topProductName}>{product.name}</Text>
                    <Text style={styles.topProductStats}>
                      {product.orders} vendas • {formatCurrency(product.revenue)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Menu Grid */}
        <Text style={styles.sectionTitle}>⚡ Gerenciar</Text>
        <View style={styles.menuGrid}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuCard}
              onPress={() => router.push(item.route as any)}
            >
              <View style={[styles.menuIcon, { backgroundColor: item.color + '15' }]}>
                <Ionicons name={item.icon as any} size={24} color={item.color} />
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
              {item.count !== null && (
                <Text style={styles.menuCount}>{item.count}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={[styles.quickBtn, { backgroundColor: '#3B82F6' }]}
            onPress={() => router.push('/admin/products')}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.quickBtnText}>Novo Produto</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.quickBtn, { backgroundColor: '#10B981' }]}
            onPress={() => router.push('/admin/qrcode')}
          >
            <Ionicons name="share-outline" size={20} color="#fff" />
            <Text style={styles.quickBtnText}>Compartilhar</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  greeting: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  restaurantName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 8,
  },
  headerBtn: {
    padding: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 20,
    marginBottom: 12,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  kpiCard: {
    width: (width - 42) / 2,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 8,
  },
  kpiLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  badge: {
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  funnelCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  funnelGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  funnelItem: {
    alignItems: 'center',
    flex: 1,
  },
  funnelIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  funnelArrow: {
    paddingHorizontal: 2,
  },
  funnelNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  funnelLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
    textAlign: 'center',
  },
  topProductsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  topProductRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  topProductRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankNumber: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#6B7280',
  },
  topProductInfo: {
    flex: 1,
  },
  topProductName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  topProductStats: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  menuCard: {
    width: (width - 42) / 2,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  menuIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  menuCount: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  quickBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  quickBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});
