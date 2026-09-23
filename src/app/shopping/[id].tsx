import { useLocalSearchParams } from 'expo-router';

import { ShoppingDetailsScreen } from '@/screens/shopping-details';

export default function ShoppingDetailsRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ShoppingDetailsScreen recordId={id ?? ''} />;
}
