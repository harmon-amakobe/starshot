export function Eye({ open }: { open: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      {open ? (
        <>
          <path d="M2 12q10-15 20 0-10 15-20 0Z" />
          <circle cx="12" cy="12" r="3" />
        </>
      ) : (
        <>
          <path d="M3 9q9 12 18 0M5 13l-2 3m8-1v4m8-6 2 3" />
        </>
      )}
    </svg>
  );
}
