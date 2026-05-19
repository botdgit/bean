import { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';
import type { CatalogItem, CatalogModifier } from '@/types/database';

export type MenuSection = {
  category: string;
  items: CatalogItem[];
};

function group(items: CatalogItem[]): MenuSection[] {
  const sections = new Map<string, CatalogItem[]>();
  for (const item of items) {
    const cat = item.category ?? 'Other';
    const list = sections.get(cat) ?? [];
    list.push(item);
    sections.set(cat, list);
  }
  return Array.from(sections, ([category, items]) => ({ category, items }));
}

export function useCafeMenu(cafeId: string | undefined) {
  const [sections, setSections] = useState<MenuSection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!cafeId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);

    supabase
      .from('catalog_items')
      .select('*')
      .eq('cafe_id', cafeId)
      .eq('is_available', true)
      .order('sort')
      .then(({ data }) => {
        if (!cancelled) {
          setSections(group(data ?? []));
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [cafeId]);

  return { sections, loading };
}

export function useCatalogItem(itemId: string | undefined) {
  const [item, setItem] = useState<CatalogItem | null>(null);
  const [modifiers, setModifiers] = useState<CatalogModifier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!itemId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);

    (async () => {
      const { data: itemRow } = await supabase
        .from('catalog_items')
        .select('*')
        .eq('id', itemId)
        .single();

      if (!itemRow || cancelled) {
        if (!cancelled) setLoading(false);
        return;
      }

      const { data: modRows } = await supabase
        .from('catalog_modifiers')
        .select('*')
        .eq('parent_item_id', itemId)
        .order('sort');

      if (cancelled) return;
      setItem(itemRow);
      setModifiers(modRows ?? []);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [itemId]);

  return { item, modifiers, loading };
}
