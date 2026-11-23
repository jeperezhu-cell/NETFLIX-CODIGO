import { avatarBg } from "@/lib/avatars";
export default function Avatar({ k, url, size = 128 }: { k: string; url?: string | null; size?: number }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" width={size} height={size} className="rounded-md object-cover" style={{ width: size, height: size }} />;
  }
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className="rounded-md" aria-hidden>
      <rect width="100" height="100" fill={avatarBg(k)} />
      <circle cx="34" cy="40" r="6" fill="#fff" /><circle cx="66" cy="40" r="6" fill="#fff" />
      <circle cx="35" cy="41" r="3" fill="#111" /><circle cx="65" cy="41" r="3" fill="#111" />
      <path d="M28 62 Q50 84 72 62" stroke="#fff" strokeWidth="6" strokeLinecap="round" fill="none" />
    </svg>
  );
}
