// The KSBL origami bird, redrawn as flat triangles ("facets"). Used large in the hero and small
// in empty states. Each facet picks one colour from a palette, so the same shape works on navy
// (white bird), on light backgrounds (navy bird) and in the logo's multicolour version.

// Facets as [x1,y1, x2,y2, x3,y3, shade]. `shade` indexes the palette (0 = lightest / brightest).
// "A" is the amber beak. Coordinates live in a 600 x 460 box.
const FACETS = [
  [372, 60, 292, 222, 392, 236, 1], // far wing
  [372, 60, 292, 222, 330, 142, 3],
  [96, 110, 262, 246, 180, 262, 1], // near wing
  [96, 110, 262, 246, 214, 150, 2],
  [96, 110, 214, 150, 150, 92, 3],
  [40, 352, 200, 262, 236, 318, 4], // tail
  [40, 352, 236, 318, 300, 330, 5],
  [200, 262, 330, 206, 236, 318, 0], // body
  [330, 206, 430, 262, 300, 330, 3],
  [330, 206, 300, 330, 236, 318, 2],
  [430, 262, 472, 180, 506, 240, 0], // neck
  [472, 180, 548, 128, 506, 240, 2],
  [472, 180, 548, 128, 522, 170, 3], // head
  [548, 128, 590, 152, 522, 170, "A"], // beak
];

const PALETTES = {
  // white bird for the navy hero
  light: ["#FFFFFF", "#EEF3FB", "#DCE6F5", "#C3D3EC", "#9FB7DA", "#7E9AC4"],
  // navy bird for pale backgrounds
  dark: ["#0B3566", "#1D4A82", "#05274F", "#1D5BB5", "#3078D8", "#9FB4D6"],
  // the small colourful bird from the logo
  brand: ["#3078D8", "#1D5BB5", "#FBA733", "#D83C54", "#A92B42", "#E8962A"],
};
const AMBER = "#FBA733";

// Every facet starts a little further from the centre and glides into place.
const CENTER = [300, 230];
const offset = (f) => {
  const cx = (f[0] + f[2] + f[4]) / 3 - CENTER[0];
  const cy = (f[1] + f[3] + f[5]) / 3 - CENTER[1];
  const len = Math.hypot(cx, cy) || 1;
  return [(cx / len) * 26, (cy / len) * 26];
};

/**
 * The facets only (a <g>), so the bird can live inside any <svg> (the hero scene embeds it).
 *  tone    - "light" | "dark" | "brand"
 *  animate - true: facets assemble on load (hero only)
 */
export function BirdFacets({ tone = "light", animate = false }) {
  const palette = PALETTES[tone];
  return (
    <g>
      {FACETS.map((f, i) => {
        const [dx, dy] = offset(f);
        const fill = f[6] === "A" ? AMBER : palette[f[6]];
        return (
          <polygon
            key={i}
            points={`${f[0]},${f[1]} ${f[2]},${f[3]} ${f[4]},${f[5]}`}
            fill={fill}
            stroke={fill}
            strokeWidth="1"
            strokeLinejoin="round"
            className={animate ? "facet" : undefined}
            style={animate ? { "--i": i, "--dx": `${dx}px`, "--dy": `${dy}px` } : undefined}
          />
        );
      })}
    </g>
  );
}

/**
 * Standalone bird. Props:
 *  tone    - "light" | "dark" | "brand"
 *  animate - true: facets assemble on load, then the bird drifts slowly
 */
export default function Bird({ tone = "light", animate = false, className = "", ...rest }) {
  return (
    <svg viewBox="0 0 600 460" className={className} aria-hidden="true" focusable="false" {...rest}>
      <g className={animate ? "bird-drift" : undefined}>
        <BirdFacets tone={tone} animate={animate} />
      </g>
    </svg>
  );
}
