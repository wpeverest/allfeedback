const EmptyCanvasIllustration = () => (
	<svg
		width="280"
		height="176"
		viewBox="0 0 280 176"
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
		aria-hidden="true"
	>
 		<rect
			x="28" y="8" width="186" height="126" rx="13"
			stroke="var(--primary)" strokeOpacity="0.22" strokeWidth="1.5"
			strokeDasharray="7 5"
		/>

 		<rect x="28" y="8" width="186" height="36" rx="13"
			fill="var(--primary)" fillOpacity="0.055" />
 		<rect x="28" y="30" width="186" height="14" fill="var(--primary)" fillOpacity="0.055" />

 		<rect x="44" y="19" width="78" height="9" rx="4.5"
			fill="var(--primary)" fillOpacity="0.25" />

 		<circle cx="192" cy="23" r="1.8" fill="var(--primary)" fillOpacity="0.22" />
		<circle cx="200" cy="23" r="1.8" fill="var(--primary)" fillOpacity="0.22" />
		<circle cx="208" cy="23" r="1.8" fill="var(--primary)" fillOpacity="0.22" />

 		<rect x="44" y="56" width="54" height="7" rx="3.5"
			fill="var(--muted-foreground)" fillOpacity="0.18" />
 		<rect x="44" y="69" width="154" height="18" rx="7"
			fill="var(--muted-foreground)" fillOpacity="0.05"
			stroke="var(--border)" strokeOpacity="0.55" strokeWidth="1" />
 		<rect x="51" y="75" width="1.5" height="7" rx="1"
			fill="var(--primary)" fillOpacity="0.40" />

 		<rect x="44" y="99" width="70" height="7" rx="3.5"
			fill="var(--muted-foreground)" fillOpacity="0.18" />
 		<rect x="44" y="112" width="154" height="18" rx="7"
			fill="var(--muted-foreground)" fillOpacity="0.05"
			stroke="var(--border)" strokeOpacity="0.55" strokeWidth="1" />
		<rect x="51" y="118" width="88" height="6" rx="3"
			fill="var(--muted-foreground)" fillOpacity="0.13" />

 		<text
			x="240" y="82"
			fontSize="10.5"
			fontStyle="italic"
			fill="var(--muted-foreground)"
			fillOpacity="0.65"
			textAnchor="middle"
		>
			Start here
		</text>


		<path
			d="M 222 80 C 262 80 140 128 140 168"
			stroke="var(--primary)" strokeOpacity="0.38" strokeWidth="1.5"
			strokeLinecap="round" strokeDasharray="5 4" fill="none"
		/>

 		<path
			d="M 133 161 L 140 170 L 147 161"
			stroke="var(--primary)" strokeOpacity="0.52" strokeWidth="1.5"
			strokeLinecap="round" strokeLinejoin="round" fill="none"
		/>
	</svg>
);

export default EmptyCanvasIllustration;
