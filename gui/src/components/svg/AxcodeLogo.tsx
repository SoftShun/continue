import { vscForeground } from "..";

interface AxcodeLogoProps {
  height?: number;
  width?: number;
}

export default function AxcodeLogo({
  height = 75,
  width = 200,
}: AxcodeLogoProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 400 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* AXCODE 텍스트 */}
      <text
        x="50"
        y="65"
        fontSize="40"
        fontWeight="bold"
        fontFamily="system-ui, -apple-system, sans-serif"
        fill={vscForeground}
      >
        AXCODE
      </text>

      {/* 아이콘 */}
      <g transform="translate(5, 20)">
        <path
          d="M20 10L30 30L10 30Z"
          fill={vscForeground}
          opacity="0.8"
        />
        <path
          d="M5 35L15 15L25 35Z"
          fill={vscForeground}
          opacity="0.6"
        />
      </g>
    </svg>
  );
}