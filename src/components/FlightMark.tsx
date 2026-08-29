interface FlightMarkProps {
  className?: string
}

export default function FlightMark({ className = '' }: FlightMarkProps) {
  return (
    <span className={`flight-mark ${className}`} aria-hidden="true">
      <svg viewBox="0 0 42 42" role="presentation">
        <path
          className="flight-mark__trail"
          d="M4 29.5c8.8 3.2 18.7 1.8 27.2-3.9"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="2"
        />
        <path
          className="flight-mark__plane"
          d="m34.4 8.2-8.1 12.6-8.5-2.5-3.2 3.4 8.3 4.7-3.7 5.8 3.2 1.7 5.1-5 4.4 1.7 2.5-2.5-2.6-4.1 7.8-10.2c1.3-1.7 1.3-3.7.1-4.3-1.2-.6-3 .4-4.1 2.1Z"
          fill="currentColor"
        />
      </svg>
    </span>
  )
}
