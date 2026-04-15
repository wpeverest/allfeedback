/**
 * Stub type declarations for @wordpress/* packages that are externalized
 * by @wordpress/dependency-extraction-webpack-plugin.
 * They are available as globals at runtime; these stubs satisfy TypeScript.
 */


declare module '@wordpress/blocks' {
	export interface BlockEditProps<T extends Record<string, unknown>> {
		attributes:    T;
		setAttributes: ( attrs: Partial<T> ) => void;
		isSelected:    boolean;
		clientId:      string;
	}

	export function registerBlockType(
		name: string,
		settings: {
			title?:      string;
			category?:   string;
			icon?:       string;
			attributes?: Record<string, unknown>;
			edit:        ( props: BlockEditProps<any> ) => JSX.Element | null;
			save:        ( props: BlockEditProps<any> ) => JSX.Element | null;
			[ key: string ]: unknown;
		},
	): unknown;
}

declare module '@wordpress/block-editor' {
	import type { HTMLAttributes } from 'react';

	export function useBlockProps(
		props?: HTMLAttributes<HTMLElement>,
	): HTMLAttributes<HTMLElement> & { ref?: React.Ref<any> };

	export const InspectorControls: React.ComponentType<{ children: React.ReactNode }>;
}

declare module '@wordpress/components' {
	import type { FC, ReactNode } from 'react';

	interface PanelBodyProps {
		title?:       string;
		initialOpen?: boolean;
		children?:    ReactNode;
	}
	export const PanelBody: FC<PanelBodyProps>;

	interface ComboboxControlOption { value: string; label: string; [k: string]: unknown }
	interface ComboboxControlProps {
		label?:               string;
		help?:                string;
		value:                string;
		options:              ComboboxControlOption[];
		onChange:             ( value: string | null ) => void;
		onFilterValueChange?: ( value: string | null ) => void;
	}
	export const ComboboxControl: FC<ComboboxControlProps>;

	interface PlaceholderProps {
		icon?:         string;
		label?:        string;
		instructions?: string;
		children?:     ReactNode;
	}
	export const Placeholder: FC<PlaceholderProps>;

	export const Spinner: FC<{ children?: ReactNode }>;

	interface NoticeProps {
		status?:       'info' | 'warning' | 'error' | 'success';
		isDismissible?: boolean;
		children?:     ReactNode;
	}
	export const Notice: FC<NoticeProps>;
}
