import { getRenew } from "@/lib/settings";
import SettingsForm from "@/components/SettingsForm";

export default async function SettingsPage() {
  const r = await getRenew();
  return <SettingsForm initial={{ title: r.title, message: r.message, phone: r.phone, phoneLabel: r.phoneLabel }} />;
}
