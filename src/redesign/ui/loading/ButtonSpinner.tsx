export default function ButtonSpinner({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`ix-btn-spinner ${className}`}
      viewBox="0 0 16 16"
      aria-hidden="true"
    >
      <circle className="ix-btn-spinner-track" cx="8" cy="8" r="6" />
      <circle
        className="ix-btn-spinner-arc"
        cx="8"
        cy="8"
        r="6"
        transform="rotate(-90 8 8)"
      />
    </svg>
  );
}
