// The hero illustration: the origami bird carries a paper luggage tag home. The tag shows a real
// recent report (category + place), so the picture says "we bring lost things back" without adding
// any more words to the page. Purely decorative, so it is hidden from screen readers.
import { BirdFacets } from "./Bird";

// Long place names would overflow the little tag, so shorten them.
function shortPlace(place = "") {
  if (place.includes("(CAC)")) return "CAC";
  return place.length > 20 ? `${place.slice(0, 19)}…` : place;
}

/** featured - the report to show on the tag ({ category, location, type }); a friendly default if none yet */
export default function HeroArt({ featured, className = "" }) {
  const category = featured ? featured.category : "Your item";
  const place = featured ? shortPlace(featured.location) : "waiting for you";
  const flap = featured && featured.type === "Lost" ? "#B42340" : "#1D5BB5";

  return (
    <svg viewBox="0 0 560 456" className={className} aria-hidden="true" focusable="false">
      {/* The navy block from the logo, which the bird flies out of */}
      <rect x="150" y="10" width="400" height="330" rx="28" fill="#fff" fillOpacity="0.045" />

      {/* Small colourful bird (the logo's second bird) */}
      {/* (CSS animations replace an element's SVG transform, so the drift lives on an inner group) */}
      <g transform="translate(400 6) scale(0.2) rotate(8 300 230)">
        <g className="bird-drift-slow">
          <BirdFacets tone="brand" animate />
        </g>
      </g>

      {/* Big white bird */}
      <g transform="translate(6 14) scale(0.8)">
        <g className="bird-drift">
          <BirdFacets tone="light" animate />
        </g>
      </g>

      {/* String from the bird's belly to the tag, then the swinging tag itself */}
      <g className="tag-drop">
        <path d="M252 262 C 250 290, 262 300, 262 322" fill="none" stroke="#C3D3EC" strokeWidth="2" strokeLinecap="round" />
        <g transform="translate(262 322)">
          <g className="tag-swing">
            {/* tag body with the top-right corner folded over */}
            <path d="M-82 14 Q-82 6 -74 6 H44 L82 44 V100 Q82 110 72 110 H-72 Q-82 110 -82 100 Z" fill="#fff" />
            <path d="M44 6 L82 44 H54 Q44 44 44 34 Z" fill={flap} />
            <circle cx="-56" cy="26" r="6" fill="#05274F" />
            <text x="-62" y="72" fontSize="27" fontWeight="700" fill="#05274F" style={{ fontFamily: "var(--font-display)" }}>
              {category}
            </text>
            <text x="-62" y="95" fontSize="15" fontWeight="500" fill="#4B5A70" style={{ fontFamily: "var(--font-sans)" }}>
              {place}
            </text>
          </g>
        </g>
      </g>
    </svg>
  );
}
