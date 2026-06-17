import { request } from './client';

export type AboutVideo = {
	youtube_id: string | null;
	embed_url:  string | null;
};

export const aboutApi = {
	getVideo: () => request<AboutVideo>( '/about/video' ),
};
