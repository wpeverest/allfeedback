import { aboutApi, type AboutVideo } from '@/admin/api/about';

const CACHE_KEY = 'allfeedback_about_video';

type CachedVideo = { data: AboutVideo; cachedAt: number };

// Only resolved videos are persisted, so a hit lets us render the iframe
// immediately instead of showing the loading screen on every visit.
const readCache = (): CachedVideo | undefined => {
	try {
		const raw = localStorage.getItem(CACHE_KEY);
		if (!raw) return undefined;
		const parsed = JSON.parse(raw) as CachedVideo;
		return parsed?.data?.embed_url ? parsed : undefined;
	} catch {
		return undefined;
	}
};

const writeCache = (data: AboutVideo): void => {
	try {
		if (data?.embed_url) {
			const payload: CachedVideo = { data, cachedAt: Date.now() };
			localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
		} else {
			// Keep the cache in sync if a published video is ever removed.
			localStorage.removeItem(CACHE_KEY);
		}
	} catch {
		// Best-effort: ignore storage quota/availability errors.
	}
};

export const aboutVideoQuery = () => {
	const cached = readCache();

	return {
		queryKey: ['about', 'video'] as const,
		queryFn: async (): Promise<AboutVideo> => {
			const data = await aboutApi.getVideo();
			writeCache(data);
			return data;
		},
		// Seeding initialData keeps isLoading false on repeat visits; the stored
		// timestamp still lets a stale entry refresh silently in the background.
		initialData:          cached?.data,
		initialDataUpdatedAt: cached?.cachedAt,
		staleTime:            60 * 60_000, // 1 hour — matches the server-side cache
		refetchOnWindowFocus: false,
	};
};
