import {notFound} from "next/navigation";
import type {Metadata} from "next";
import ManagementCenter from "@/components/account/ManagementCenter";
import SystemCenter from "@/components/account/SystemCenter";
import {managementEntries} from "@/lib/server/management-entry";

export const dynamic = "force-dynamic";
export const metadata:Metadata = {robots:{index:false,follow:false},referrer:"no-referrer"};

export default async function Page({params}:{params:Promise<{managementEntry:string}>}) {
  const {managementEntry}=await params;
  const entries=managementEntries();
  if(entries&&`/${managementEntry}`===entries.manage)return <ManagementCenter/>;
  if(entries&&`/${managementEntry}`===entries.system)return <SystemCenter/>;
  notFound();
}
