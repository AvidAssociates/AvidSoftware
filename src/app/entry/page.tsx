import { listRecruiters } from "@/lib/queries";
import EntryForm from "./EntryForm";

export const dynamic = "force-dynamic";

export default function EntryPage() {
  const recruiters = listRecruiters(true);
  return <EntryForm recruiters={recruiters} />;
}
