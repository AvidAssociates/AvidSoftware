import { getAnnualGoal, listRecruiters } from "@/lib/queries";
import SettingsForm from "./SettingsForm";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  const recruiters = listRecruiters(false);
  const annualGoal = getAnnualGoal();
  return <SettingsForm recruiters={recruiters} annualGoal={annualGoal} />;
}
