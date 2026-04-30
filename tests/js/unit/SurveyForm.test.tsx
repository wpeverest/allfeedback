import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fetchMock from 'jest-fetch-mock';
import { SurveyForm } from '@/frontend/components/SurveyForm';
import type { AllfbConfig, Survey } from '@/frontend/types';

const cfg: AllfbConfig = {
	siteUrl:     'http://localhost',
	restUrl:     'http://localhost/wp-json/',
	nonce:       'test-nonce',
	submitNonce: 'submit-nonce',
	version:     '1.0.0',
	settings: {
		color:           '#000',
		position:        'bottom-right',
        trigger:         'auto',
		delay:           0,
		scroll_threshold: 50,
		show_on_mobile:  true,
	},
};

const makeSurvey = (overrides: Partial<Survey> = {}): Survey => ({
	id:          1,
	title:       'Test Survey',
	form_schema: {
		version:  '1',
		sections: [
			{
				id:     's1',
				title:  'Section 1',
				fields: [
					{ id: 'q1', type: 'short_text', label: 'Your name', required: true },
				],
			},
		],
	},
	settings: null,
	...overrides,
});

beforeEach(() => fetchMock.resetMocks());

describe('SurveyForm', () => {
	it('renders the form fields from the survey schema', () => {
		render(
			<SurveyForm
				cfg={cfg}
				survey={makeSurvey()}
				submitNonce="nonce"
				onSuccess={jest.fn()}
			/>,
		);
		expect(screen.getByText('Your name')).toBeInTheDocument();
	});

	it('shows placeholder when survey has no questions', () => {
		render(
			<SurveyForm
				cfg={cfg}
				survey={makeSurvey({ form_schema: { version: '1', sections: [] } })}
				submitNonce="nonce"
				onSuccess={jest.fn()}
			/>,
		);
		expect(screen.getByText(/no questions/i)).toBeInTheDocument();
	});

	it('shows validation error when required field is empty on submit', async () => {
		render(
			<SurveyForm
				cfg={cfg}
				survey={makeSurvey()}
				submitNonce="nonce"
				onSuccess={jest.fn()}
			/>,
		);
		await userEvent.click(screen.getByRole('button', { name: /submit/i }));
		expect(await screen.findByText('This field is required.')).toBeInTheDocument();
	});

	it('calls onSuccess after a successful submission', async () => {
		fetchMock.mockResponseOnce(JSON.stringify({ success: true, data: {} }), { status: 200 });
		const onSuccess = jest.fn();

		render(
			<SurveyForm
				cfg={cfg}
				survey={makeSurvey()}
				submitNonce="nonce"
				onSuccess={onSuccess}
			/>,
		);

		await userEvent.type(screen.getByRole('textbox'), 'Alice');
		await userEvent.click(screen.getByRole('button', { name: /submit/i }));

		await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
	});

	it('shows error message on failed submission', async () => {
		fetchMock.mockResponseOnce('Server Error', { status: 500 });

		render(
			<SurveyForm
				cfg={cfg}
				survey={makeSurvey()}
				submitNonce="nonce"
				onSuccess={jest.fn()}
			/>,
		);

		await userEvent.type(screen.getByRole('textbox'), 'Alice');
		await userEvent.click(screen.getByRole('button', { name: /submit/i }));

		expect(await screen.findByText(/submission failed/i)).toBeInTheDocument();
	});
});
