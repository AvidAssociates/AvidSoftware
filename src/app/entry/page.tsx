import { listRecruiters } from "@/lib/queries";
import EntryForm from "./EntryForm";

export const dynamic = "force-dynamic";

export default async function EntryPage() {
  const recruiters = await listRecruiters(true);
  return <EntryForm recruiters={recruiters} />;
}
