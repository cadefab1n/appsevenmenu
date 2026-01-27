import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Linking,
  useColorScheme,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCartStore } from '../store/cartStore';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

export default function CartScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const { items, removeItem, updateQuantity, clearCart, getTotalItems, getTotalPrice } = useCartStore();
  const [whatsapp, setWhatsapp] = useState('');
  const [restaurantName, setRestaurantName] = useState('');

  useEffect(() => {
    loadRestaurantInfo();
  }, []);

  const loadRestaurantInfo = async () => {
    try {
      const res = await fetch(`${API_URL}/api/restaurants`);
      const data = await res.json();
      if (data.restaurants && data.restaurants.length > 0) {
        setWhatsapp(data.restaurants[0].whatsapp);
        setRestaurantName(data.restaurants[0].name);
      }
    } catch (error) {
      console.error('Error loading restaurant:', error);
    }
  };

  const handleCheckout = async () => {
    if (items.length === 0) {
      Alert.alert('Carrinho vazio', 'Adicione produtos ao carrinho primeiro');
      return;
    }

    if (!whatsapp) {
      Alert.alert('Erro', 'Número do WhatsApp não encontrado. Configure o WhatsApp do restaurante no painel admin.');
      return;
    }

    // Montar mensagem do pedido - SIMPLIFICADA para evitar bloqueios
    let message = `Olá! Gostaria de fazer um pedido:\n\n`;
    
    items.forEach((item, index) => {
      message += `${item.quantity}x ${item.name} - R$ ${(item.price * item.quantity).toFixed(2)}\n`;
    });
    
    message += `\nTOTAL: R$ ${getTotalPrice().toFixed(2)}\n\n`;
    message += `Aguardo confirmação!`;

    // Limpar número - usar apenas dígitos
    let phoneNumber = whatsapp.replace(/\D/g, '');
    
    // Se o número já começa com 55, usar direto
    // Se não, adicionar 55 (Brasil)
    if (!phoneNumber.startsWith('55')) {
      phoneNumber = '55' + phoneNumber;
    }
    
    console.log('=== WhatsApp Debug ===');
    console.log('Número original:', whatsapp);
    console.log('Número formatado:', phoneNumber);
    
    // Usar API do WhatsApp - formato mais simples
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`;
    
    console.log('URL:', whatsappUrl);
    
    try {
      // Na web, abrir diretamente em nova aba
      if (Platform.OS === 'web') {
        window.open(whatsappUrl, '_blank');
        
        Alert.alert(
          'WhatsApp',
          'Uma nova aba foi aberta. Complete o envio da mensagem no WhatsApp!',
          [
            {
              text: 'Limpar Carrinho',
              onPress: () => {
                clearCart();
                router.push('/menu');
              }
            },
            { text: 'Manter Carrinho' }
          ]
        );
        return;
      }
      
      // Em dispositivos móveis - tentar abrir
      await Linking.openURL(whatsappUrl);
      
      Alert.alert(
        'Pedido Enviado!',
        'Complete o envio no WhatsApp. Aguarde a confirmação do restaurante.',
        [
          {
            text: 'OK',
            onPress: () => {
              clearCart();
              router.push('/menu');
            }
          }
        ]
      );
    } catch (error) {
      console.error('Erro ao abrir WhatsApp:', error);
      
      // Fallback - tentar wa.me
      const fallbackUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
      
      if (Platform.OS === 'web') {
        window.open(fallbackUrl, '_blank');
        return;
      }
      
      try {
        await Linking.openURL(fallbackUrl);
      } catch (e) {
        Alert.alert(
          'Erro ao abrir WhatsApp',
          `Entre em contato diretamente pelo número: ${whatsapp}`,
          [{ text: 'OK' }]
        );
      }
    }
  };

  if (items.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? '#000' : '#f5f5f5' }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.push('/menu')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={isDark ? '#fff' : '#000'} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: isDark ? '#fff' : '#000' }]}>Carrinho</Text>
          <View style={styles.backButton} />
        </View>

        <View style={styles.emptyContainer}>
          <Ionicons name="cart-outline" size={80} color="#ccc" />
          <Text style={[styles.emptyText, { color: isDark ? '#fff' : '#666' }]}>Seu carrinho está vazio</Text>
          <Text style={[styles.emptySubtext, { color: isDark ? '#aaa' : '#999' }]}>Adicione produtos ao carrinho para fazer seu pedido</Text>
          <TouchableOpacity
            style={styles.continueButton}
            onPress={() => router.push('/menu')}
          >
            <Text style={styles.continueButtonText}>Ver Cardápio</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#000' : '#f5f5f5' }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/menu')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={isDark ? '#fff' : '#000'} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: isDark ? '#fff' : '#000' }]}>Carrinho ({getTotalItems()})</Text>
        <TouchableOpacity onPress={clearCart} style={styles.clearButton}>
          <Ionicons name="trash-outline" size={20} color="#F44336" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {items.map(item => (
          <View key={item.id} style={[styles.cartItem, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
            {item.image ? (
              <Image source={{ uri: item.image }} style={styles.itemImage} />
            ) : (
              <View style={styles.itemImagePlaceholder}>
                <Ionicons name="image-outline" size={30} color="#ccc" />
              </View>
            )}
            
            <View style={styles.itemDetails}>
              <Text style={[styles.itemName, { color: isDark ? '#fff' : '#000' }]} numberOfLines={2}>
                {item.name}
              </Text>
              <Text style={styles.itemPrice}>R$ {item.price.toFixed(2)}</Text>
            </View>

            <View style={styles.quantityControl}>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => updateQuantity(item.id, item.quantity - 1)}
              >
                <Ionicons name="remove" size={20} color="#fff" />
              </TouchableOpacity>
              <Text style={[styles.quantityText, { color: isDark ? '#fff' : '#000' }]}>
                {item.quantity}
              </Text>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => updateQuantity(item.id, item.quantity + 1)}
              >
                <Ionicons name="add" size={20} color="#fff" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => removeItem(item.id)}
            >
              <Ionicons name="close" size={24} color="#F44336" />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
        <View style={styles.totalContainer}>
          <Text style={[styles.totalLabel, { color: isDark ? '#aaa' : '#666' }]}>Total</Text>
          <Text style={[styles.totalPrice, { color: '#ffea07' }]}>R$ {getTotalPrice().toFixed(2)}</Text>
        </View>
        <TouchableOpacity
          style={styles.checkoutButton}
          onPress={handleCheckout}
        >
          <Ionicons name="logo-whatsapp" size={24} color="#fff" />
          <Text style={styles.checkoutButtonText}>Finalizar Pedido</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  clearButton: {
    width: 40,
    alignItems: 'flex-end',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 24,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  continueButton: {
    backgroundColor: '#ffea07',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 24,
    marginTop: 24,
  },
  continueButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  itemImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
  },
  itemImagePlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemDetails: {
    flex: 1,
    marginLeft: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffea07',
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  quantityButton: {
    backgroundColor: '#ffea07',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginHorizontal: 12,
    minWidth: 24,
    textAlign: 'center',
  },
  removeButton: {
    padding: 4,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  totalLabel: {
    fontSize: 16,
  },
  totalPrice: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  checkoutButton: {
    flexDirection: 'row',
    backgroundColor: '#25D366',
    paddingVertical: 16,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkoutButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});
