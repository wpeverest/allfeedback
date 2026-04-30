import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '@components/ui/button';

describe('Button', () => {
	it('renders children', () => {
		render(<Button>Click me</Button>);
		expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
	});

	it('calls onClick when clicked', async () => {
		const onClick = jest.fn();
		render(<Button onClick={onClick}>Go</Button>);
		await userEvent.click(screen.getByRole('button'));
		expect(onClick).toHaveBeenCalledTimes(1);
	});

	it('does not call onClick when disabled', async () => {
		const onClick = jest.fn();
		render(<Button disabled onClick={onClick}>Go</Button>);
		await userEvent.click(screen.getByRole('button'));
		expect(onClick).not.toHaveBeenCalled();
	});

	it('applies data-variant attribute', () => {
		render(<Button variant="danger">Delete</Button>);
		expect(screen.getByRole('button')).toHaveAttribute('data-variant', 'danger');
	});

	it('applies data-size attribute', () => {
		render(<Button size="sm">Small</Button>);
		expect(screen.getByRole('button')).toHaveAttribute('data-size', 'sm');
	});
});
