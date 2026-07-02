











export default function AppBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 bg-surface-page"
    >
      {}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          background:
            'radial-gradient(60rem 40rem at 15% -10%, var(--color-accent), transparent 60%)',
        }}
      />
    </div>
  );
}
