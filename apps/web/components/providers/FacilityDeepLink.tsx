'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/stores/useAuth';
import { useConsole } from '@/stores/useConsole';

export function FacilityDeepLink() {
  const search = useSearchParams();
  const setFacility = useConsole((s) => s.setFacility);
  const plants = useAuth((s) => s.plants);

  useEffect(() => {
    const id = search.get('facility');
    if (id && plants.some((p) => p.id === id)) {
      setFacility(id);
    }
  }, [plants, search, setFacility]);

  return null;
}
