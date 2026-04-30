import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CopyButton from '@components/ui/copy-button';

// Mock sonner so toast calls don't error in jsdom
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

describe('CopyButton', () => {
	beforeEach(() => {
		Object.assign(navigator, {
			clipboard: { writeText: jest.fn().mockResolvedValue(undefined) },
		});
	});

	it('renders a button', () => {
		render(<CopyButton text="hello" />);
		expect(screen.getByRole('button')).toBeInTheDocument();
	});

	it('calls clipboard.writeText with the provided text', async () => {
		render(<CopyButton text="copy-me" />);
		await userEvent.click(screen.getByRole('button'));
		await waitFor(() => {
			expect(navigator.clipboard.writeText).toHaveBeenCalledWith('copy-me');
		});
	});
});
