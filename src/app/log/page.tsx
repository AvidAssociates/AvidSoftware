import { listBillings, listRecruiters, listSendouts } from "@/lib/queries";
import LogTables from "./LogTables";

export const dynamic = "force-dynamic";

export default async function LogPage() {
  const recruiters = await listRecruiters(false);
  const sendouts = await listSendouts();
  const billings = await listBillings();
  return (
    <LogTables
      recruiters={recruiters}
      sendouts={sendouts}
      billings={billings}
    />
  );
}
