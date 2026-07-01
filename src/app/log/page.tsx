import { listBillings, listRecruiters, listSendouts } from "@/lib/queries";
import LogTables from "./LogTables";

export const dynamic = "force-dynamic";

export default function LogPage() {
  const recruiters = listRecruiters(false);
  const sendouts = listSendouts();
  const billings = listBillings();
  return (
    <LogTables
      recruiters={recruiters}
      sendouts={sendouts}
      billings={billings}
    />
  );
}
