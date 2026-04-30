import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { __ } from '@wordpress/i18n';
import { Pipette } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

// ── Color utilities ──────────────────────────────────────────────────────────

type ColorFormat = 'HEX' | 'RGB' | 'HSL';

const clamp = ( n: number, lo: number, hi: number ) => Math.min( hi, Math.max( lo, n ) );

function hexToRgb( hex: string ): { r: number; g: number; b: number } | null {
	const m = hex.replace( '#', '' ).match( /^([a-f\d]{6})$/i );
	if ( ! m ) return null;
	const n = parseInt( m[ 1 ], 16 );
	return { r: ( n >> 16 ) & 255, g: ( n >> 8 ) & 255, b: n & 255 };
}

function rgbToHex( r: number, g: number, b: number ): string {
	return '#' + [ r, g, b ]
		.map( ( x ) => clamp( Math.round( x ), 0, 255 ).toString( 16 ).padStart( 2, '0' ) )
		.join( '' );
}

function rgbToHsl( r: number, g: number, b: number ) {
	r /= 255; g /= 255; b /= 255;
	const max = Math.max( r, g, b ), min = Math.min( r, g, b );
	let h = 0, s = 0;
	const l = ( max + min ) / 2;
	if ( max !== min ) {
		const d = max - min;
		s = l > 0.5 ? d / ( 2 - max - min ) : d / ( max + min );
		switch ( max ) {
			case r: h = ( ( g - b ) / d + ( g < b ? 6 : 0 ) ) / 6; break;
			case g: h = ( ( b - r ) / d + 2 ) / 6; break;
			case b: h = ( ( r - g ) / d + 4 ) / 6; break;
		}
	}
	return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToRgb( h: number, s: number, l: number ) {
	s /= 100; l /= 100;
	const k = ( n: number ) => ( n + h / 30 ) % 12;
	const a = s * Math.min( l, 1 - l );
	const f = ( n: number ) => l - a * Math.max( -1, Math.min( k( n ) - 3, Math.min( 9 - k( n ), 1 ) ) );
	return { r: f( 0 ) * 255, g: f( 8 ) * 255, b: f( 4 ) * 255 };
}

function formatValue( hex: string, fmt: ColorFormat ): string {
	const rgb = hexToRgb( hex );
	if ( ! rgb ) return hex;
	if ( fmt === 'HEX' ) return hex.toUpperCase();
	if ( fmt === 'RGB' ) return `${ rgb.r }, ${ rgb.g }, ${ rgb.b }`;
	const { h, s, l } = rgbToHsl( rgb.r, rgb.g, rgb.b );
	return `${ Math.round( h ) }, ${ Math.round( s ) }%, ${ Math.round( l ) }%`;
}

function parseValue( input: string, fmt: ColorFormat ): string | null {
	const v = input.trim();
	if ( fmt === 'HEX' ) {
		const h = v.replace( '#', '' );
		if ( /^[a-f\d]{6}$/i.test( h ) ) return '#' + h.toLowerCase();
		if ( /^[a-f\d]{3}$/i.test( h ) )
			return '#' + h.split( '' ).map( ( c ) => c + c ).join( '' ).toLowerCase();
		return null;
	}
	const parts = v.split( /[,\s]+/ ).filter( Boolean ).map( ( p ) => p.replace( '%', '' ) );
	if ( parts.length !== 3 ) return null;
	const nums = parts.map( Number );
	if ( nums.some( ( n ) => Number.isNaN( n ) ) ) return null;
	if ( fmt === 'RGB' ) return rgbToHex( nums[ 0 ], nums[ 1 ], nums[ 2 ] );
	const { r, g, b } = hslToRgb( nums[ 0 ], nums[ 1 ], nums[ 2 ] );
	return rgbToHex( r, g, b );
}

// ── Slider Tailwind classes ──────────────────────────────────────────────────

const RANGE_CLS = [
	'w-full cursor-pointer appearance-none rounded-full',
	// webkit track
	'[&::-webkit-slider-runnable-track]:h-2.5 [&::-webkit-slider-runnable-track]:rounded-full',
	// webkit thumb — margin-top centres the 16px thumb on the 10px track: (10-16)/2 = -3px
	'[&::-webkit-slider-thumb]:appearance-none',
	'[&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4',
	'[&::-webkit-slider-thumb]:mt-[-3px]',
	'[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white',
	'[&::-webkit-slider-thumb]:shadow-[0_0_0_1.5px_rgba(0,0,0,0.18),0_1px_4px_rgba(0,0,0,0.22)]',
	'[&::-webkit-slider-thumb]:cursor-pointer',
	// moz track + thumb
	'[&::-moz-range-track]:h-2.5 [&::-moz-range-track]:rounded-full',
	'[&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4',
	'[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-none',
	'[&::-moz-range-thumb]:bg-white',
	'[&::-moz-range-thumb]:shadow-[0_0_0_1.5px_rgba(0,0,0,0.18),0_1px_4px_rgba(0,0,0,0.22)]',
].join( ' ' );

// ────────────────────────────────────────────────────────────────────────────

interface ColorPickerProps {
	value:      string;
	onChange:   ( v: string ) => void;
	className?: string;
}

export const ColorPicker = ( { value, onChange, className }: ColorPickerProps ) => {
	const [ format, setFormat ] = useState<ColorFormat>( 'HEX' );
	const [ draft,  setDraft  ] = useState( () => formatValue( value, 'HEX' ) );
	const [ open,   setOpen   ] = useState( false );

	useEffect( () => {
		setDraft( formatValue( value, format ) );
	}, [ value, format ] );

	const commit = ( hex: string ) => onChange( hex );

	const handleBlur = () => {
		const parsed = parseValue( draft, format );
		if ( parsed ) commit( parsed );
		else setDraft( formatValue( value, format ) );
	};

	const cycleFormat = () => {
		const order: ColorFormat[] = [ 'HEX', 'RGB', 'HSL' ];
		setFormat( order[ ( order.indexOf( format ) + 1 ) % order.length ] );
	};

	return (
		<div
			className={ cn(
				'inline-flex items-stretch overflow-hidden rounded-lg border border-border/50 bg-background shadow-sm transition-colors focus-within:border-primary/40 focus-within:ring-1 focus-within:ring-primary/10',
				className,
			) }
			style={{ height: 30 }}
		>
			{/* Swatch → opens popover */}
			<Popover open={ open } onOpenChange={ setOpen }>
				<PopoverTrigger asChild>
					<button
						type="button"
						aria-label={ __( 'Open color picker', 'allfeedback' ) }
						className="group relative shrink-0 overflow-hidden focus-visible:outline-none"
						style={{ width: 30, height: 30, backgroundColor: value }}
					>
						<span className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/20" />
						<Pipette className="absolute right-0.5 bottom-0.5 size-2.5 text-white opacity-70 transition-opacity drop-shadow-[0_0_2px_rgba(0,0,0,0.5)] group-hover:opacity-100" />
					</button>
				</PopoverTrigger>
				<PopoverContent className="w-auto p-0" align="start" sideOffset={ 6 }>
					<SaturationPicker
						hex={ value }
						onChange={ commit }
						onDone={ () => setOpen( false ) }
					/>
				</PopoverContent>
			</Popover>

			{/* Text input */}
			<input
				value={ draft }
				onChange={ ( e ) => setDraft( e.target.value ) }
				onBlur={ handleBlur }
				onKeyDown={ ( e ) => { if ( e.key === 'Enter' ) ( e.target as HTMLInputElement ).blur(); } }
				spellCheck={ false }
				className="bg-transparent font-mono text-[11px] tracking-tight text-foreground/80 outline-none"
				style={{ width: 124, height: 30, padding: '0 8px', boxSizing: 'border-box' }}
			/>

			{/* Format switcher */}
			<button
				type="button"
				onClick={ cycleFormat }
				className="shrink-0 bg-muted/40 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground/60 transition-colors hover:bg-muted/70 hover:text-foreground/80 focus-visible:outline-none"
				style={{ height: 30, padding: '0 9px' }}
			>
				{ format }
			</button>
		</div>
	);
};

// ── Saturation / lightness 2-D canvas + hue slider ───────────────────────────

const SaturationPicker = ( {
	hex,
	onChange,
	onDone,
}: {
	hex:      string;
	onChange: ( hex: string ) => void;
	onDone:   () => void;
} ) => {
	const rgb0 = hexToRgb( hex ) ?? { r: 99, g: 102, b: 241 };
	const hsl0 = rgbToHsl( rgb0.r, rgb0.g, rgb0.b );

	const [ h, setH ] = useState( hsl0.h );
	const [ s, setS ] = useState( hsl0.s );
	const [ l, setL ] = useState( hsl0.l );

	// Store without '#' so we can show a '#' prefix label in the input
	const [ hexDraft, setHexDraft ] = useState( hex.replace( '#', '' ).toUpperCase() );

	const areaRef     = useRef<HTMLDivElement>( null );
	const draggingRef = useRef( false );

	useEffect( () => {
		const r = hexToRgb( hex );
		if ( ! r ) return;
		const next = rgbToHsl( r.r, r.g, r.b );
		setH( next.h );
		setS( next.s );
		setL( next.l );
		setHexDraft( hex.replace( '#', '' ).toUpperCase() );
	}, [ hex ] );

	const emit = ( nh: number, ns: number, nl: number ) => {
		const { r, g, b } = hslToRgb( nh, ns, nl );
		onChange( rgbToHex( r, g, b ) );
	};

	const handleAreaMove = ( e: MouseEvent | React.MouseEvent ) => {
		const el = areaRef.current;
		if ( ! el ) return;
		const rect = el.getBoundingClientRect();
		const x  = clamp( ( e.clientX - rect.left ) / rect.width,  0, 1 );
		const y  = clamp( ( e.clientY - rect.top  ) / rect.height, 0, 1 );
		const v  = 1 - y;
		const sv = x;
		const nl = v * ( 1 - sv / 2 ) * 100;
		const ns = ( nl === 0 || nl === 100 ) ? 0 : ( ( v * 100 - nl ) / Math.min( nl, 100 - nl ) ) * 100;
		setS( ns );
		setL( nl );
		emit( h, ns, nl );
	};

	useEffect( () => {
		const move = ( e: MouseEvent ) => { if ( draggingRef.current ) handleAreaMove( e ); };
		const up   = () => { draggingRef.current = false; };
		window.addEventListener( 'mousemove', move );
		window.addEventListener( 'mouseup',   up );
		return () => {
			window.removeEventListener( 'mousemove', move );
			window.removeEventListener( 'mouseup',   up );
		};
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [ h ] );

	// Convert HSL → HSV to get correct 2-D marker position
	const vv      = l / 100 + ( s / 100 ) * Math.min( l / 100, 1 - l / 100 );
	const sv      = vv === 0 ? 0 : 2 * ( 1 - ( l / 100 ) / vv );
	const markerX = clamp( sv, 0, 1 ) * 100;
	const markerY = ( 1 - vv ) * 100;

	return (
		<div className="w-56 select-none overflow-hidden rounded-xl">

			{/* ── 2-D gradient canvas ─────────────────────────────────────── */}
			<div
				ref={ areaRef }
				onMouseDown={ ( e ) => { draggingRef.current = true; handleAreaMove( e ); } }
				className="relative cursor-crosshair"
				style={{
					height: 168,
					background: [
						'linear-gradient(to top, #000 0%, transparent 100%)',
						`linear-gradient(to right, #fff 0%, hsl(${ Math.round( h ) }, 100%, 50%) 100%)`,
					].join( ', ' ),
					boxShadow: 'inset 0 -1px 0 rgba(0,0,0,0.10)',
				}}
			>
				<div
					className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
					style={{
						left:      `${ markerX }%`,
						top:       `${ markerY }%`,
						width:     14,
						height:    14,
						border:    '2.5px solid white',
						boxShadow: '0 0 0 1px rgba(0,0,0,0.25), 0 1px 4px rgba(0,0,0,0.18)',
					}}
				/>
			</div>

			{/* ── Hue slider ──────────────────────────────────────────────── */}
			<div className="bg-white px-3 py-3">
				<input
					type="range"
					min={ 0 }
					max={ 360 }
					value={ Math.round( h ) }
					onChange={ ( e ) => {
						const nh = Number( e.target.value );
						setH( nh );
						emit( nh, s, l );
					} }
					className={ RANGE_CLS }
					style={{
						display:    'block',
						width:      '100%',
						height:     10,
						background: 'linear-gradient(to right,#f00 0%,#ff0 17%,#0f0 33%,#0ff 50%,#00f 67%,#f0f 83%,#f00 100%)',
						boxSizing:  'border-box',
					}}
				/>
			</div>

			{/* ── Value row ───────────────────────────────────────────────── */}
			<div
				className="flex items-center gap-2 px-3 pb-3 pt-0"
			>
				{/* Live colour swatch */}
				<div
					className="shrink-0 rounded-md"
					style={{
						width:           28,
						height:          28,
						backgroundColor: hex,
						boxShadow:       'inset 0 0 0 1px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08)',
					}}
				/>

				{/* Editable hex input with '#' prefix */}
				<div className="relative min-w-0 flex-1">
					<span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 select-none font-mono text-[11px] text-foreground/30">
						#
					</span>
					<input
						type="text"
						value={ hexDraft }
						onChange={ ( e ) => {
							const val = e.target.value.replace( '#', '' ).toUpperCase();
							setHexDraft( val );
							const parsed = parseValue( '#' + val, 'HEX' );
							if ( parsed ) onChange( parsed );
						} }
						onBlur={ () => setHexDraft( hex.replace( '#', '' ).toUpperCase() ) }
						onKeyDown={ ( e ) => { if ( e.key === 'Enter' ) ( e.target as HTMLInputElement ).blur(); } }
						maxLength={ 6 }
						spellCheck={ false }
						className="w-full rounded-md border border-border/40 bg-muted/30 font-mono text-[11px] uppercase text-foreground/70 outline-none transition-colors focus:border-primary/50 focus:bg-white"
						style={{ height: 28, paddingLeft: 18, paddingRight: 7, boxSizing: 'border-box' }}
					/>
				</div>

				{/* Done */}
				<button
					type="button"
					onClick={ onDone }
					className="shrink-0 rounded-md border border-primary/25 font-medium text-[11px] text-primary transition-colors hover:bg-primary hover:text-white hover:border-primary focus-visible:outline-none"
					style={{ height: 28, padding: '0 10px' }}
				>
					{ __( 'Done', 'allfeedback' ) }
				</button>
			</div>
		</div>
	);
};
