import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from '@components/ui/input';
import { Badge } from '@components/ui/badge';

describe('Input', () => {
	it('renders with placeholder', () => {
		render(<Input placeholder="Enter text" />);
		expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
	});

	it('fires onChange with new value', async () => {
		const onChange = jest.fn();
		render(<Input onChange={onChange} />);
		await userEvent.type(screen.getByRole('textbox'), 'hello');
		expect(onChange).toHaveBeenCalled();
	});

	it('is disabled when disabled prop is set', () => {
		render(<Input disabled />);
		expect(screen.getByRole('textbox')).toBeDisabled();
	});
});

describe('Badge', () => {
	it('renders children', () => {
		render(<Badge>Active</Badge>);
		expect(screen.getByText('Active')).toBeInTheDocument();
	});

	it('renders with default variant class', () => {
		const { container } = render(<Badge>Label</Badge>);
		// cva applies bg-primary/10 for default variant
		expect(container.firstChild).toHaveClass('bg-primary/10');
	});
});
