import type { AllfbConfig } from '../types';
import { SurveyPanel } from './SurveyPanel';

interface EmbedRootProps {
	cfg:      AllfbConfig;
	surveyId: number;
	nonce:    string;
}

export const EmbedRoot = ( { cfg, surveyId, nonce }: EmbedRootProps ) => (
	<SurveyPanel
		cfg={ cfg }
		surveyId={ surveyId }
		submitNonce={ nonce }
	/>
);
