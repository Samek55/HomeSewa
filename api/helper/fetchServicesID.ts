import { supabase } from '../../lib/supabase';

let servicesCache: Record<string, string> | null = null;
let servicesPromise: Promise<Record<string, string>> | null = null;

export const fetchServicesMap = async (): Promise<Record<string, string>> => {
  if (servicesCache) return servicesCache;
  if (servicesPromise) return servicesPromise;

  servicesPromise = (async () => {
    const { data, error } = await supabase.from('services').select('id, name');
    if (error || !data || data.length === 0) {
      // Don't let a transient failure/empty result poison the cache forever — clear the
      // in-flight promise so the next call retries instead of reusing this empty result.
      servicesPromise = null;
      return {};
    }
    const map: Record<string, string> = {};
    data.forEach((item: any) => { map[String(item.id)] = item.name; });
    servicesCache = map;
    return map;
  })();

  return servicesPromise;
};
