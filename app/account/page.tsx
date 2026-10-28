import {Suspense} from "react";
import AccountPage from "@/components/account/AccountPage";
import "../resident-workbench.css";
export default function Page(){return <Suspense fallback={<p role="status">正在展开居民工作台…</p>}><AccountPage/></Suspense>;}
