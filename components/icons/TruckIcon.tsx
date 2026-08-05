import React from "react"

type IconProps = {
  size?: number
  strokeWidth?: number
}

export default function TruckIcon({ size = 32 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M14 34 H42 L50 42 V48 H50"
        stroke="#2563eb"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M14 34 L14 22 H30 L34 34"
        stroke="#2563eb"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M30 22 H44 V34"
        stroke="#2563eb"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="20" cy="50" r="5" fill="#2563eb" opacity="0.16" />
      <circle cx="20" cy="50" r="3" fill="#2563eb" />
      <circle cx="44" cy="50" r="5" fill="#2563eb" opacity="0.16" />
      <circle cx="44" cy="50" r="3" fill="#2563eb" />
      <path
        d="M10 52 H54"
        stroke="#60a5fa"
        strokeWidth="4"
        strokeLinecap="round"
        opacity="0.2"
      />
      <path
        d="M18 26 H27"
        stroke="#2563eb"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.6"
      />
    </svg>
  )
}
