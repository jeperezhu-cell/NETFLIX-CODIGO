import { getRenew } from "@/lib/settings";
import { getAdmin } from "@/lib/session";
import SettingsForm from "@/components/SettingsForm";

export default async function SettingsPage() {
  const r = await getRenew();
  const admin = await getAdmin();
  return <SettingsForm username={admin?.username ?? ""} initial={{ title: r.title, message: r.message, phone: r.phone, phoneLabel: r.phoneLabel }} />;
}
