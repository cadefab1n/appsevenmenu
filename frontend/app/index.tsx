import { Redirect } from 'expo-router';

export default function Index() {
  // Redirect to menu tab by default
  return <Redirect href="/(tabs)/menu" />;
}
