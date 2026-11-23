export default function Sharingan({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden>
      <circle cx="100" cy="100" r="96" fill="#e10613" />
      <circle cx="100" cy="100" r="62" fill="none" stroke="#000" strokeWidth="5" />
      <circle cx="100" cy="100" r="15" fill="#000" />
      {[0, 120, 240].map((a) => (
        <g key={a} transform={`rotate(${a} 100 100)`}><circle cx="100" cy="38" r="13" fill="#000" /><path d="M100 25 q22 4 24 30 q-8 -16 -24 -17z" fill="#000" /></g>
      ))}
    </svg>
  );
}
