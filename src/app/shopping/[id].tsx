import { useLocalSearchParams } from 'expo-router';

import { ShoppingDetailsScreen } from '@/screens/shopping-details';

export default function ShoppingDetailsRoute() {
  const { id, new: isNew } = useLocalSearchParams<{ id: string; new?: string }>();
  return <ShoppingDetailsScreen recordId={id ?? ''} isNew={isNew === '1'} />;
}
