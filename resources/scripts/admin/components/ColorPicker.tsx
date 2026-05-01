import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { __ } from '@wordpress/i18n';
import { Check, Copy, Palette } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

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

// ── Custom drag-based hue slider ─────────────────────────────────────────────
// Native <input type="range"> is unreliable in WP admin due to stylesheet overrides.
// This custom implementation gives pixel-perfect control over track and thumb styling.

const HueSlider = ( {
	value,
	onChange,
}: {
	value:    number;
	onChange: ( h: number ) => void;
} ) => {
	const trackRef  = useRef<HTMLDivElement>( null );
	const dragging  = useRef( false );

	const moveTo = useCallback( ( clientX: number ) => {
		const el = trackRef.current;
		if ( ! el ) return;
		const rect = el.getBoundingClientRect();
		onChange( clamp( ( clientX - rect.left ) / rect.width, 0, 1 ) * 360 );
	}, [ onChange ] );

	useEffect( () => {
		const move = ( e: MouseEvent ) => { if ( dragging.current ) moveTo( e.clientX ); };
		const up   = () => { dragging.current = false; };
		window.addEventListener( 'mousemove', move );
		window.addEventListener( 'mouseup',   up );
		return () => {
			window.removeEventListener( 'mousemove', move );
			window.removeEventListener( 'mouseup',   up );
		};
	}, [ moveTo ] );

	return (
		<div
			ref={ trackRef }
			className="relative w-full cursor-pointer select-none rounded-full"
			style={{
				height:     12,
				background: 'linear-gradient(to right,#f00 0%,#ff0 17%,#0f0 33%,#0ff 50%,#00f 67%,#f0f 83%,#f00 100%)',
				boxShadow:  'inset 0 0 0 1px rgba(0,0,0,0.08)',
			}}
			onMouseDown={ ( e ) => { dragging.current = true; moveTo( e.clientX ); } }
		>
			{/* Thumb — centred on the track, 20 px diameter */}
			<div
				className="pointer-events-none absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white"
				style={{
					left:      `${ ( value / 360 ) * 100 }%`,
					width:     20,
					height:    20,
					boxShadow: '0 0 0 1.5px rgba(0,0,0,0.14), 0 2px 6px rgba(0,0,0,0.18)',
				}}
			/>
		</div>
	);
};

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
		<div className={ cn( 'inline-flex items-center gap-2', className ) }>
			{/* ── Swatch trigger (standalone) ──────────────────────────── */}
			<Popover open={ open } onOpenChange={ setOpen }>
				<PopoverTrigger asChild>
					<button
						type="button"
						aria-label={ __( 'Open color picker', 'allfeedback' ) }
						className="relative m-0 shrink-0 overflow-hidden rounded-lg border-0 p-0 shadow-sm focus-visible:outline-none"
						style={{
							width:           40,
							height:          40,
							backgroundColor: value,
							boxShadow:       '0 0 0 1px rgba(0,0,0,0.10), inset 0 0 0 1px rgba(255,255,255,0.15)',
							borderRadius:    '0.5rem',
							overflow:        'hidden',
						}}
					>
						<Palette
							className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white"
							style={{
								width:   16,
								height:  16,
								opacity: 0.85,
								filter:  'drop-shadow(0 1px 2px rgba(0,0,0,0.55))',
							}}
						/>
					</button>
				</PopoverTrigger>
				<PopoverContent className="w-auto p-0" align="start" sideOffset={ 6 }>
					<SaturationPicker hex={ value } onChange={ commit } />
				</PopoverContent>
			</Popover>

			{/* ── Input wrapper — styled like global Input ──────────────── */}
			<div className="relative flex min-w-0 flex-1 items-center border border-border bg-muted/60 transition-colors focus-within:bg-white" style={{ height: 40, borderRadius: '0.5rem', overflow: 'hidden' }}>
				<input
					value={ draft }
					onChange={ ( e ) => {
						const v = e.target.value;
						setDraft( v );
						const parsed = parseValue( v, format );
						if ( parsed ) commit( parsed );
					} }
					onBlur={ handleBlur }
					onKeyDown={ ( e ) => { if ( e.key === 'Enter' ) ( e.target as HTMLInputElement ).blur(); } }
					spellCheck={ false }
					className="h-full w-full bg-transparent font-mono text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
					style={{ paddingLeft: 12, paddingRight: 64, boxSizing: 'border-box', margin: 0, border: 'none' }}
				/>
				{/* Format badge — inside the input, right side */}
				<button
					type="button"
					onClick={ cycleFormat }
					className="absolute right-2 top-1/2 -translate-y-1/2 flex cursor-pointer items-center rounded-none px-3 py-1.5 font-bold uppercase tracking-widest text-foreground transition-colors hover:bg-border/70 focus-visible:outline-none bg-border/40"
					style={{ fontSize: 12 }}
				>
					{ format }
				</button>
			</div>
		</div>
	);
};

// ── 2-D gradient canvas + hue slider ────────────────────────────────────────

const SaturationPicker = ( {
	hex,
	onChange,
}: {
	hex:      string;
	onChange: ( hex: string ) => void;
} ) => {
	const [ copied, setCopied ] = useState( false );
	const rgb0 = hexToRgb( hex ) ?? { r: 99, g: 102, b: 241 };
	const hsl0 = rgbToHsl( rgb0.r, rgb0.g, rgb0.b );

	const [ h, setH ] = useState( hsl0.h );
	const [ s, setS ] = useState( hsl0.s );
	const [ l, setL ] = useState( hsl0.l );

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

	const handleCanvasMove = ( e: MouseEvent | React.MouseEvent ) => {
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
		const move = ( e: MouseEvent ) => { if ( draggingRef.current ) handleCanvasMove( e ); };
		const up   = () => { draggingRef.current = false; };
		window.addEventListener( 'mousemove', move );
		window.addEventListener( 'mouseup',   up );
		return () => {
			window.removeEventListener( 'mousemove', move );
			window.removeEventListener( 'mouseup',   up );
		};
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [ h ] );

	// Convert HSL → HSV for correct 2-D marker position
	const vv      = l / 100 + ( s / 100 ) * Math.min( l / 100, 1 - l / 100 );
	const sv      = vv === 0 ? 0 : 2 * ( 1 - ( l / 100 ) / vv );
	const markerX = clamp( sv, 0, 1 ) * 100;
	const markerY = ( 1 - vv ) * 100;

	return (
		<div className="select-none overflow-hidden rounded-xl" style={{ width: 220 }}>

			{/* ── Gradient canvas ──────────────────────────────────────────── */}
			<div className="p-3 pb-0 bg-white">
				<div
					ref={ areaRef }
					onMouseDown={ ( e ) => { draggingRef.current = true; handleCanvasMove( e ); } }
					className="relative cursor-crosshair rounded-lg overflow-hidden"
					style={{
						height:     200,
						background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${ Math.round( h ) }, 100%, 50%))`,
						boxShadow:  'inset 0 0 0 1px rgba(0,0,0,0.10)',
					}}
				>
					{/* Subtle top highlight for depth */}
					<div
						className="pointer-events-none absolute inset-x-0 top-0"
						style={{ height: 48, background: 'linear-gradient(to bottom, rgba(255,255,255,0.07) 0%, transparent 100%)' }}
					/>

					{/* Marker */}
					<div
						className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
						style={{
							left:            `${ markerX }%`,
							top:             `${ markerY }%`,
							width:           14,
							height:          14,
							backgroundColor: hex,
							border:          '2.5px solid white',
							boxShadow:       '0 0 0 1px rgba(0,0,0,0.22), 0 1px 5px rgba(0,0,0,0.18)',
						}}
					/>
				</div>
			</div>

			{/* ── Hue slider ───────────────────────────────────────────────── */}
			<div className="bg-white px-4 pt-3.5 pb-3">
				<HueSlider
					value={ h }
					onChange={ ( nh ) => { setH( nh ); emit( nh, s, l ); } }
				/>
			</div>

			{/* ── Value row ────────────────────────────────────────────────── */}
			<div className="flex items-center gap-2.5 border-t border-border/[0.12] bg-white px-4 pb-4 pt-3">

				{/* Live swatch */}
				<div
					className="shrink-0 rounded-md"
					style={{
						width:           32,
						height:          32,
						backgroundColor: hex,
						boxShadow:       'inset 0 0 0 1px rgba(0,0,0,0.12)',
					}}
				/>

				{/* Editable hex input with '#' prefix */}
				<div className="relative min-w-0 flex-1">
					<span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 select-none font-mono text-[11px] text-foreground/30">
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
						style={{ height: 32, paddingLeft: 20, paddingRight: 8, boxSizing: 'border-box' }}
					/>
				</div>

				{/* Copy hex */}
				<button
					type="button"
					aria-label={ __( 'Copy hex value', 'allfeedback' ) }
					onClick={ () => {
						const text = hex.toUpperCase();
						const done = () => { setCopied( true ); setTimeout( () => setCopied( false ), 1500 ); };
						if ( navigator.clipboard && window.isSecureContext ) {
							void navigator.clipboard.writeText( text ).then( done );
						} else {
							const el = document.createElement( 'textarea' );
							el.value = text;
							el.style.cssText = 'position:fixed;left:-9999px;top:-9999px';
							document.body.appendChild( el );
							el.focus();
							el.select();
							try { document.execCommand( 'copy' ); done(); } finally { document.body.removeChild( el ); }
						}
					} }
					className="shrink-0 cursor-pointer rounded-md border border-border/50 transition-colors hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none"
					style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
				>
					{ copied
						? <Check style={{ width: 13, height: 13, color: 'var(--color-primary)' }} />
						: <Copy style={{ width: 13, height: 13, color: 'var(--color-foreground)', opacity: 0.55 }} />
					}
				</button>
			</div>
		</div>
	);
};
