const SERVICES_URL = process.env.EXPO_PUBLIC_AIRTABLE_API_URL_SERVICES;
const TOKEN = process.env.EXPO_PUBLIC_AIRTABLE_TOKEN;

// 🚀 in-memory cache
let servicesCache: Record<string, string> | null = null;
let servicesPromise: Promise<Record<string, string>> | null = null;

export const fetchServicesMap = async () => {
  try {
    // ✅ return cached data instantly
    if (servicesCache) {
      return servicesCache;
    }

    // ✅ prevent multiple parallel fetches
    if (servicesPromise) {
      return servicesPromise;
    }

    servicesPromise = (async () => {
      const res = await fetch(SERVICES_URL!, {
        headers: {
          Authorization: `Bearer ${TOKEN}`,
        },
      });

      const data = await res.json();

      const map: Record<string, string> = {};

      data.records?.forEach((item: any) => {
        const id = item.id;
        const name = item.fields?.["Name"];

        if (id && name) {
          map[id] = name;
        }
      });

      servicesCache = map; // store in memory

      return map;
    })();

    const result = await servicesPromise;
    return result;
  } catch (error) {
    console.log("Services fetch error:", error);
    return {};
  }
};