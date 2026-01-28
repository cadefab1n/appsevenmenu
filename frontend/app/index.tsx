import { Redirect } from 'expo-router';

export default function Index() {
  // Cliente vai direto para o cardápio do restaurante
  // Admin deve acessar via /admin-dashboard
  return <Redirect href="/restaurantesena" />;
}
