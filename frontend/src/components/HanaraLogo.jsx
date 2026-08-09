import React from 'react';

const HanaraLogo = ({ className = '', size = 48 }) => {
  return (
    <svg
      viewBox="0 0 240 230"
      className={className}
      style={{ width: size, height: (size * 230) / 240 }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Glow filter for premium feel */}
        <filter id="logoGlow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#000000" floodOpacity="0.12" />
        </filter>
        {/* Curved path for bottom text - swept deeper to curve beautifully inside the shield tip */}
        <path
          id="mottoCurve"
          d="M 45,126 C 45,166 75,186 120,186 C 165,186 195,166 195,134"
          fill="none"
        />
      </defs>

      {/* Main Shield - Extremely broad and WIDE (not narrow), keeping the elegant original height */}
      <path
        d="M 20,20 H 220 C 230,200 165,181 120,212 C 40,180 20,135 20,90 Z"
        fill="#FEF9C3"
        stroke="#781A1A"
        strokeWidth="5.5"
        strokeLinejoin="round"
        filter="url(#logoGlow)"
      />

      {/* "HANARA SCHOOLS" Text - centered beautifully and spaced nicely inside */}
      <text
        x="120"
        y="50"
        textAnchor="middle"
        fill="#781A1A"
        fontSize="14.5"
        fontWeight="bold"
        fontFamily="'Outfit', system-ui, -apple-system, sans-serif"
        letterSpacing="0.8"
      >
        HANARA SCHOOLS
      </text>

      {/* ─── Lightbulb (Center-Top) - Classic vertical loop filament centered at x=120 ─── */}
      <g transform="translate(0, 2)">
        {/* Outer Glass */}
        <path
          d="M 120,60 C 130,60 137,68 137,77 C 137,83 133,87 130,91 C 128,94 127,97 127,100 H 113 C 112,97 111,94 109,91 C 106,87 102,83 100,77 C 100,68 107,60 120,60 Z"
          fill="none"
          stroke="#781A1A"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Filament lines inside */}
        <path
          d="M 116,82 L 118,72 L 122,72 L 125,82"
          fill="none"
          stroke="#781A1A"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Loop on top of filament - standard outline, NOT heart-shaped */}
        <path
          d="M 118,72 C 118,68 122,68 122,72"
          fill="none"
          stroke="#781A1A"
          strokeWidth="1.8"
        />
        {/* Socket Thread Base */}
        <path
          d="M 114,100 H 126 M 113,104 H 127 M 116,108 H 124"
          stroke="#781A1A"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        {/* Glow rays */}
        <path
          d="M 96,77 H 90 M 144,77 H 150 M 102,64 L 97,59 M 138,64 L 143,59"
          stroke="#781A1A"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </g>

      {/* ─── Year Texts - Shifted inwards closer to the book pages ─── */}
      <text
        x="58"
        y="134"
        textAnchor="middle"
        fill="#781A1A"
        fontSize="13.5"
        fontWeight="bold"
        fontFamily="Times New Roman"
      >
        20
      </text>
      <text
        x="182"
        y="134"
        textAnchor="middle"
        fill="#781A1A"
        fontSize="13.5"
        fontWeight="bold"
        fontFamily="Times New Roman"
      >
        14
      </text>

      {/* ─── Open Book & Pencil (Center-Bottom) centered at x=120 ─── */}
      <g transform="translate(0, -6)">
        {/* Left Page */}
        <path
          d="M 120,154 C 106,149 91,149 76,154 V 126 C 91,121 106,120 120,124 Z"
          fill="#FEF9C3"
          stroke="#781A1A"
          strokeWidth="2.8"
          strokeLinejoin="round"
        />
        {/* Right Page */}
        <path
          d="M 120,154 C 134,149 149,149 164,154 V 126 C 149,121 134,120 120,124 Z"
          fill="#FEF9C3"
          stroke="#781A1A"
          strokeWidth="2.8"
          strokeLinejoin="round"
        />
        {/* Spine line */}
        <line x1="120" y1="124" x2="120" y2="154" stroke="#781A1A" strokeWidth="2.8" />
        
        {/* Pencil writing */}
        <g transform="rotate(32 148 116)">
          <path
            d="M 136,110 H 154 V 116.5 H 136 Z"
            fill="#781A1A"
            stroke="#781A1A"
            strokeWidth="0.5"
          />
          <path
            d="M 136,110 L 128,113.25 L 136,116.5 Z"
            fill="#781A1A"
          />
        </g>
      </g>

      {/* ─── Curved Motto Text - Perfectly swept inside on the yellow part only ─── */}
      <text
        fontSize="7.8"
        fontWeight="bold"
        fontFamily="'Outfit', system-ui, sans-serif"
        letterSpacing="0.4"
        fill="#781A1A"
      >
        <textPath href="#mottoCurve" startOffset="50%" textAnchor="middle">
          KNOWLEDGE AND DISCIPLINE
        </textPath>
      </text>
    </svg>
  );
};

export default HanaraLogo;
