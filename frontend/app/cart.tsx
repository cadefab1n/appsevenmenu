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
  Platform,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCartStore } from '../store/cartStore';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

const PAYMENT_METHODS = [
  { id: 'pix', label: 'PIX', icon: 'qr-code-outline' },
  { id: 'dinheiro', label: 'Dinheiro', icon: 'cash-outline' },
  { id: 'cartao_credito', label: 'Crédito', icon: 'card-outline' },
  { id: 'cartao_debito', label: 'Débito', icon: 'card-outline' },
];

export default function CartScreen() {
  const router = useRouter();
  const { items, removeItem, updateQuantity, clearCart, getTotalItems, getTotalPrice } = useCartStore();
  const [whatsapp, setWhatsapp] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#E63946');
  
  // Dados do cliente
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [reference, setReference] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [needChange, setNeedChange] = useState('');
  const [observation, setObservation] = useState('');

  useEffect(() => {
    loadRestaurantInfo();
  }, []);

  const loadRestaurantInfo = async () => {
    try {
      const res = await fetch(`${API_URL}/api/restaurants`);
      const data = await res.json();
      if (data.restaurants?.length > 0) {
        setWhatsapp(data.restaurants[0].whatsapp);
        setRestaurantName(data.restaurants[0].name);
        setPrimaryColor(data.restaurants[0].primary_color || '#E63946');
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

    if (!customerName.trim()) {
      Alert.alert('Atenção', 'Por favor, informe seu nome');
      return;
    }

    if (!street.trim() || !number.trim() || !neighborhood.trim()) {
      Alert.alert('Atenção', 'Por favor, preencha o endereço completo (rua, número e bairro)');
      return;
    }

    if (!paymentMethod) {
      Alert.alert('Atenção', 'Por favor, selecione a forma de pagamento');
      return;
    }

    if (!whatsapp) {
      Alert.alert('Erro', 'WhatsApp do restaurante não configurado');
      return;
    }

    // Montar mensagem
    let message = `*🛒 NOVO PEDIDO - ${restaurantName}*\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    // Dados do cliente
    message += `*👤 CLIENTE*\n`;
    message += `Nome: ${customerName}\n`;
    if (customerPhone) message += `Telefone: ${customerPhone}\n`;
    message += `\n`;
    
    // Endereço
    message += `*📍 ENDEREÇO DE ENTREGA*\n`;
    message += `${street}, ${number}\n`;
    message += `Bairro: ${neighborhood}\n`;
    if (reference) message += `Referência: ${reference}\n`;
    message += `\n`;
    
    // Itens do pedido
    message += `*📋 ITENS DO PEDIDO*\n`;
    items.forEach((item, idx) => {
      message += `${idx + 1}. ${item.name}\n`;
      message += `   ${item.quantity}x R$ ${item.price.toFixed(2).replace('.', ',')} = R$ ${(item.price * item.quantity).toFixed(2).replace('.', ',')}\n`;
    });
    message += `\n`;
    
    // Pagamento
    const paymentLabel = PAYMENT_METHODS.find(p => p.id === paymentMethod)?.label || paymentMethod;
    message += `*💳 PAGAMENTO*\n`;
    message += `Forma: ${paymentLabel}\n`;
    if (paymentMethod === 'dinheiro' && needChange) {
      message += `Troco para: R$ ${needChange}\n`;
    }
    message += `\n`;
    
    // Total
    message += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `*💰 TOTAL: R$ ${getTotalPrice().toFixed(2).replace('.', ',')}*\n`;
    
    if (observation) {
      message += `\n📝 *Observações:* ${observation}\n`;
    }
    
    message += `\n_Pedido via Seven Menu_`;

    // Formatar número
    let phone = whatsapp.replace(/\D/g, '');
    if (!phone.startsWith('55')) phone = '55' + phone;

    const url = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`;

    try {
      if (Platform.OS === 'web') {
        window.open(url, '_blank');
        Alert.alert('WhatsApp', 'Complete o envio na nova aba!', [
          { text: 'Limpar Carrinho', onPress: () => { clearCart(); router.push('/restaurantesena'); } },
          { text: 'OK' }
        ]);
      } else {
        await Linking.openURL(url);
        clearCart();
        router.push('/restaurantesena');
      }
    } catch (error) {
      Alert.alert('Erro', `Entre em contato: ${whatsapp}`);
    }
  };

  if (items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.push('/restaurantesena')}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        
        <View style={styles.emptyContent}>
          <View style={styles.emptyIcon}>
            <Ionicons name="cart-outline" size={60} color="#D1D5DB" />
          </View>
          <Text style={styles.emptyTitle}>Seu carrinho está vazio</Text>
          <Text style={styles.emptySubtitle}>Adicione itens do cardápio para fazer seu pedido</Text>
          <TouchableOpacity 
            style={[styles.emptyBtn, { backgroundColor: primaryColor }]}
            onPress={() => router.push('/restaurantesena')}
          >
            <Text style={styles.emptyBtnText}>Ver Cardápio</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBackBtn} onPress={() => router.push('/restaurantesena')}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Finalizar Pedido</Text>
        <TouchableOpacity onPress={clearCart}>
          <Text style={[styles.clearText, { color: primaryColor }]}>Limpar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🛒 Itens do Pedido ({getTotalItems()})</Text>
          
          {items.map(item => (
            <View key={item.id} style={styles.itemCard}>
              {item.image && (
                <Image source={{ uri: item.image }} style={styles.itemImage} />
              )}
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={[styles.itemPrice, { color: primaryColor }]}>
                  R$ {(item.price * item.quantity).toFixed(2).replace('.', ',')}
                </Text>
              </View>
              
              <View style={styles.quantityControl}>
                <TouchableOpacity
                  style={styles.quantityBtn}
                  onPress={() => item.quantity > 1 ? updateQuantity(item.id, item.quantity - 1) : removeItem(item.id)}
                >
                  <Ionicons name={item.quantity > 1 ? "remove" : "trash-outline"} size={18} color="#666" />
                </TouchableOpacity>
                
                <Text style={styles.quantityText}>{item.quantity}</Text>
                
                <TouchableOpacity
                  style={[styles.quantityBtn, { backgroundColor: primaryColor }]}
                  onPress={() => updateQuantity(item.id, item.quantity + 1)}
                >
                  <Ionicons name="add" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {/* Dados do Cliente */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👤 Seus Dados</Text>
          
          <Text style={styles.inputLabel}>Nome *</Text>
          <TextInput
            style={styles.input}
            placeholder="Seu nome completo"
            placeholderTextColor="#9CA3AF"
            value={customerName}
            onChangeText={setCustomerName}
          />
          
          <Text style={styles.inputLabel}>Telefone (opcional)</Text>
          <TextInput
            style={styles.input}
            placeholder="(00) 00000-0000"
            placeholderTextColor="#9CA3AF"
            value={customerPhone}
            onChangeText={setCustomerPhone}
            keyboardType="phone-pad"
          />
        </View>

        {/* Endereço */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📍 Endereço de Entrega</Text>
          
          <Text style={styles.inputLabel}>Rua *</Text>
          <TextInput
            style={styles.input}
            placeholder="Nome da rua"
            placeholderTextColor="#9CA3AF"
            value={street}
            onChangeText={setStreet}
          />
          
          <View style={styles.row}>
            <View style={styles.halfField}>
              <Text style={styles.inputLabel}>Número *</Text>
              <TextInput
                style={styles.input}
                placeholder="Nº"
                placeholderTextColor="#9CA3AF"
                value={number}
                onChangeText={setNumber}
                keyboardType="numeric"
              />
            </View>
            
            <View style={styles.halfField}>
              <Text style={styles.inputLabel}>Bairro *</Text>
              <TextInput
                style={styles.input}
                placeholder="Bairro"
                placeholderTextColor="#9CA3AF"
                value={neighborhood}
                onChangeText={setNeighborhood}
              />
            </View>
          </View>
          
          <Text style={styles.inputLabel}>Ponto de Referência</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Próximo ao mercado, casa azul..."
            placeholderTextColor="#9CA3AF"
            value={reference}
            onChangeText={setReference}
          />
        </View>

        {/* Forma de Pagamento */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💳 Forma de Pagamento *</Text>
          
          <View style={styles.paymentOptions}>
            {PAYMENT_METHODS.map(method => (
              <TouchableOpacity
                key={method.id}
                style={[
                  styles.paymentOption,
                  paymentMethod === method.id && { borderColor: primaryColor, backgroundColor: `${primaryColor}10` }
                ]}
                onPress={() => setPaymentMethod(method.id)}
              >
                <Ionicons 
                  name={method.icon as any} 
                  size={24} 
                  color={paymentMethod === method.id ? primaryColor : '#6B7280'} 
                />
                <Text style={[
                  styles.paymentLabel,
                  paymentMethod === method.id && { color: primaryColor, fontWeight: '600' }
                ]}>
                  {method.label}
                </Text>
                {paymentMethod === method.id && (
                  <Ionicons name="checkmark-circle" size={20} color={primaryColor} />
                )}
              </TouchableOpacity>
            ))}
          </View>
          
          {paymentMethod === 'dinheiro' && (
            <>
              <Text style={styles.inputLabel}>Troco para quanto?</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: 50,00"
                placeholderTextColor="#9CA3AF"
                value={needChange}
                onChangeText={setNeedChange}
                keyboardType="decimal-pad"
              />
            </>
          )}
        </View>

        {/* Observações */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📝 Observações</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Alguma observação? (Ex: tirar cebola, sem gelo...)"
            placeholderTextColor="#9CA3AF"
            value={observation}
            onChangeText={setObservation}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Resumo */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Resumo do Pedido</Text>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal ({getTotalItems()} itens)</Text>
            <Text style={styles.summaryValue}>R$ {getTotalPrice().toFixed(2).replace('.', ',')}</Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Taxa de entrega</Text>
            <Text style={styles.summaryValue}>A combinar</Text>
          </View>
          
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={[styles.totalValue, { color: primaryColor }]}>
              R$ {getTotalPrice().toFixed(2).replace('.', ',')}
            </Text>
          </View>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* CTA Fixo */}
      <View style={styles.ctaContainer}>
        <TouchableOpacity
          style={[styles.ctaBtn, { backgroundColor: '#25D366' }]}
          onPress={handleCheckout}
        >
          <Ionicons name="logo-whatsapp" size={24} color="#fff" />
          <Text style={styles.ctaBtnText}>Enviar Pedido via WhatsApp</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  emptyContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
  emptyBtn: {
    marginTop: 28,
    paddingHorizontal: 36,
    paddingVertical: 16,
    borderRadius: 14,
  },
  emptyBtnText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
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
  backBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 50,
    left: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  clearText: {
    fontSize: 15,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderRadius: 0,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 10,
    marginRight: 14,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1F2937',
    marginHorizontal: 14,
    minWidth: 24,
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
    marginTop: 12,
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
    height: 90,
    paddingTop: 14,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfField: {
    flex: 1,
  },
  paymentOptions: {
    gap: 10,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  paymentLabel: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  summaryLabel: {
    fontSize: 15,
    color: '#6B7280',
  },
  summaryValue: {
    fontSize: 15,
    color: '#1F2937',
    fontWeight: '500',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    marginTop: 10,
    paddingTop: 14,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  totalValue: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  ctaContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 14,
    gap: 10,
  },
  ctaBtnText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
});
