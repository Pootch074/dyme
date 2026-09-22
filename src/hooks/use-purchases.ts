import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

export type Purchase = {
  id: string;
  productName: string;
  brand: string;
  model: string;
  quantity: number;
  /** Full ISO 8601 timestamp of the purchase, including time of day. */
  purchaseDate: string;
  createdAt: string;
};

type AddPurchaseInput = {
  productName: string;
  brand: string;
  model: string;
  quantity: number;
  purchaseDate: Date;
};

const STORAGE_KEY = 'tracked-purchases';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Loads, persists, and mutates the list of tracked purchases in AsyncStorage. */
export function usePurchases() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (cancelled || !raw) return;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setPurchases(parsed);
      })
      .catch((error) => {
        console.warn('Failed to load purchases from storage', error);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    // Skip until the initial load above finishes, so we don't clobber storage
    // with the empty starting state.
    if (isLoading) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(purchases)).catch((error) => {
      console.warn('Failed to save purchases to storage', error);
    });
  }, [purchases, isLoading]);

  const addPurchase = useCallback((input: AddPurchaseInput) => {
    const purchase: Purchase = {
      id: generateId(),
      productName: input.productName,
      brand: input.brand,
      model: input.model,
      quantity: input.quantity,
      purchaseDate: input.purchaseDate.toISOString(),
      createdAt: new Date().toISOString(),
    };
    setPurchases((prev) =>
      [...prev, purchase].sort((a, b) => b.purchaseDate.localeCompare(a.purchaseDate))
    );
  }, []);

  const removePurchase = useCallback((id: string) => {
    setPurchases((prev) => prev.filter((purchase) => purchase.id !== id));
  }, []);

  return { purchases, isLoading, addPurchase, removePurchase };
}
