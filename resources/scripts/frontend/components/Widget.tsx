import { useCallback, useEffect, useRef, useState } from 'react';
import type { AllfbConfig, SurveyConfig } from '../types';
import type { StateManager } from '../state';
import { trackEvent } from '../utils';
import { SurveyPanel } from './SurveyPanel';

interface WidgetProps {
	cfg:          AllfbConfig;
	surveyConfig: SurveyConfig;
	stateManager: StateManager;
}

const MsgIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
		<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
	</svg>
);

const ChatIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
		<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
	</svg>
);

const SmileIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
		<circle cx="12" cy="12" r="10" />
		<path d="M8 14s1.5 2 4 2 4-2 4-2" />
		<line x1="9" y1="9" x2="9.01" y2="9" />
		<line x1="15" y1="9" x2="15.01" y2="9" />
	</svg>
);

const StarIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
		<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
	</svg>
);

const PenIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
		<path d="M12 20h9" />
		<path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
	</svg>
);

const TRIGGER_ICONS: Record<string, () => React.ReactElement> = {
	message: MsgIcon,
	chat:    ChatIcon,
	smile:   SmileIcon,
	star:    StarIcon,
	pen:     PenIcon,
};

const MinusIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
		<line x1="5" y1="12" x2="19" y2="12" />
	</svg>
);

const CloseIcon = () => (
	<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
		<line x1="18" y1="6" x2="6" y2="18" />
		<line x1="6" y1="6" x2="18" y2="18" />
	</svg>
);

export const Widget = ( { cfg, surveyConfig, stateManager }: WidgetProps ) => {
	const { trigger, delay, scroll_threshold } = cfg.settings;
	const position     = surveyConfig.widget_position || cfg.settings.position;
	const color        = surveyConfig.widget_color    || cfg.settings.color;
	const widgetLabel  = surveyConfig.widget_label    || 'Feedback';
	const LauncherIcon = TRIGGER_ICONS[ surveyConfig.trigger_icon ?? 'message' ] ?? MsgIcon;

	const [ isRevealed, setIsRevealed ] = useState( trigger === 'manual' );
	const [ isOpen,     setIsOpen     ] = useState( false );
	const [ panelReady, setPanelReady ] = useState( false );

	const impressionRecordedRef = useRef( false );
	const sessionIdRef          = useRef( '' );
	const hasSubmittedRef       = useRef( false );

	const getGuestId = () => localStorage.getItem( 'allfb_visitor_id' ) ?? undefined;

	const initSession = useCallback( () => {
		if ( sessionIdRef.current !== '' ) return;
		const sid = Math.random().toString( 36 ).slice( 2 ) + Date.now().toString( 36 );
		sessionIdRef.current = sid;
		void trackEvent( cfg.restUrl, cfg.nonce, surveyConfig.id, 'viewed', sid, getGuestId() );
	}, [ cfg, surveyConfig.id ] );

	const reveal = useCallback( () => setIsRevealed( true ), [] );

	const open = useCallback( () => {
		setIsOpen( true );
		setPanelReady( true );
		if ( ! impressionRecordedRef.current ) {
			impressionRecordedRef.current = true;
			stateManager.recordImpression();
		}
		initSession();
	}, [ stateManager, initSession ] );

	const close = useCallback( () => setIsOpen( false ), [] );

	const toggle = useCallback( () => {
		setIsOpen( ( prev ) => {
			if ( ! prev ) {
				setPanelReady( true );
				if ( ! impressionRecordedRef.current ) {
					impressionRecordedRef.current = true;
					stateManager.recordImpression();
				}
				initSession();
			}
			return ! prev;
		} );
	}, [ stateManager, initSession ] );

	// Heartbeat every 15 s while widget is open.
	useEffect( () => {
		if ( ! isOpen || sessionIdRef.current === '' ) return;
		const sid = sessionIdRef.current;
		const id  = setInterval( () => {
			void trackEvent( cfg.restUrl, cfg.nonce, surveyConfig.id, 'heartbeat', sid, getGuestId() );
		}, 15_000 );
		return () => clearInterval( id );
	}, [ isOpen, cfg, surveyConfig.id ] );

	const handleSubmit = useCallback( () => {
		hasSubmittedRef.current = true;
		stateManager.recordSubmit();
	}, [ stateManager ] );

	const handleClose = useCallback( () => {
		if ( sessionIdRef.current !== '' && ! hasSubmittedRef.current ) {
			void trackEvent( cfg.restUrl, cfg.nonce, surveyConfig.id, 'abandoned', sessionIdRef.current, getGuestId() );
		}
		stateManager.recordDismissal();
		close();
	}, [ stateManager, close, cfg, surveyConfig.id ] );

	const handleMinimize = useCallback( () => close(), [ close ] );

	useEffect( () => {
		if ( trigger === 'manual' ) return;

		if ( trigger === 'auto' ) {
			const ms = Math.max( 0, delay ) * 1000;
			const t  = setTimeout( () => { reveal(); open(); }, ms );
			return () => clearTimeout( t );
		}

		if ( trigger === 'scroll' ) {
			const onScroll = () => {
				const max = document.documentElement.scrollHeight - window.innerHeight;
				const pct = max > 0 ? ( window.scrollY / max ) * 100 : 0;
				if ( pct >= scroll_threshold ) {
					reveal();
					window.removeEventListener( 'scroll', onScroll );
				}
			};
			window.addEventListener( 'scroll', onScroll, { passive: true } );
			return () => window.removeEventListener( 'scroll', onScroll );
		}

		if ( trigger === 'exit-intent' ) {
			const onLeave = ( e: MouseEvent ) => {
				if ( e.clientY <= 5 ) {
					reveal();
					document.removeEventListener( 'mouseleave', onLeave );
				}
			};
			document.addEventListener( 'mouseleave', onLeave );
			return () => document.removeEventListener( 'mouseleave', onLeave );
		}
	}, [] );

	const rootStyle = { '--allfb-color': color } as React.CSSProperties;

	return (
		<div
			className={ `allfb-widget${ isRevealed ? ' is-revealed' : '' }` }
			data-position={ position }
			style={ rootStyle }
		>
			<button
				type="button"
				className={ `allfb-launcher${ isOpen ? ' is-open' : '' }` }
				aria-label="Open feedback"
				aria-expanded={ isOpen }
				aria-controls="allfb-panel"
				onClick={ toggle }
			>
				{ position === 'side-tab' ? (
					<span className="allfb-launcher__tab-label">{ widgetLabel }</span>
				) : (
					<LauncherIcon />
				) }
			</button>

			<div
				id="allfb-panel"
				className={ `allfb-panel${ isOpen ? ' is-open' : '' }` }
				aria-hidden={ ! isOpen }
				role="dialog"
				aria-modal="true"
				aria-label="Feedback"
			>
				<div className="allfb-panel__header">
					{ widgetLabel && <span className="allfb-panel__title">{ widgetLabel }</span> }
					<button
						type="button"
						className="allfb-panel__close"
						aria-label="Minimise feedback"
						onClick={ handleMinimize }
					>
						<MinusIcon />
					</button>
					<button
						type="button"
						className="allfb-panel__close"
						aria-label="Close feedback"
						onClick={ handleClose }
					>
						<CloseIcon />
					</button>
				</div>

				<div className="allfb-panel__body">
					{ panelReady && (
						<SurveyPanel
							cfg={ cfg }
							surveyId={ surveyConfig.id }
							submitNonce={ cfg.submitNonce }
							sessionId={ sessionIdRef.current }
							onSubmit={ handleSubmit }
							onAutoClose={ close }
						/>
					) }
				</div>
			</div>
		</div>
	);
};
