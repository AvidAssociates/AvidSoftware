import { getAnnualGoal, listRecruiters } from "@/lib/queries";
import SettingsForm from "./SettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const recruiters = await listRecruiters(false);
  const annualGoal = await getAnnualGoal();
  return <SettingsForm recruiters={recruiters} annualGoal={annualGoal} />;
}
