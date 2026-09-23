import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import { deleteSavedImage } from '@/utils/purchase-image';

export type Purchase = {
  id: string;
  productName: string;
  brand: string;
  model: string;
  quantity: number;
  /** Full ISO 8601 timestamp of the purchase, including time of day. */
  purchaseDate: string;
  createdAt: string;
  /**
   * Saved product photo (see utils/purchase-image). Absent on purchases
   * created before photos were supported.
   */
  imageRef?: string | null;
};

type AddPurchaseInput = {
  productName: string;
  brand: string;
  model: string;
  quantity: number;
  purchaseDate: Date;
  imageRef: string | null;
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
      imageRef: input.imageRef,
    };
    setPurchases((prev) => [...prev, purchase]);
  }, []);

  const updatePurchase = useCallback(
    (id: string, input: AddPurchaseInput) => {
      const previousImageRef = purchases.find((purchase) => purchase.id === id)?.imageRef;
      if (previousImageRef && previousImageRef !== input.imageRef) {
        deleteSavedImage(previousImageRef);
      }

      setPurchases((prev) =>
        prev.map((purchase) =>
          purchase.id === id
            ? {
                ...purchase,
                productName: input.productName,
                brand: input.brand,
                model: input.model,
                quantity: input.quantity,
                purchaseDate: input.purchaseDate.toISOString(),
                imageRef: input.imageRef,
              }
            : purchase
        )
      );
    },
    [purchases]
  );

  const removePurchase = useCallback(
    (id: string) => {
      const imageRef = purchases.find((purchase) => purchase.id === id)?.imageRef;
      if (imageRef) deleteSavedImage(imageRef);

      setPurchases((prev) => prev.filter((purchase) => purchase.id !== id));
    },
    [purchases]
  );

  return { purchases, isLoading, addPurchase, updatePurchase, removePurchase };
}
