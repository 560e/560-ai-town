"use client";
import Link from 'next/link';
import CourseCatalog from './CourseCatalog';
export {academyRequest} from './CourseCatalog';
export default function AcademyWorkbench({initialView='catalog'}:{initialView?:'catalog'|'mine'|'paths'}){
 return <section className="academy-workbench"><nav className="academy-tabs" aria-label="学院栏目"><Link href="/academy">课程目录</Link><Link href="/districts/learning-campus">返回学院校园 ↗</Link></nav>{initialView==='mine'&&<p className="academy-notice">这里是你的学院课程入口。请在课程所在平台查看个人学习记录，小镇不提供站内报名或学习进度。</p>}{initialView==='paths'&&<p className="academy-notice">学习路径筹备中，当前可浏览下方已发布的站外课程。</p>}<CourseCatalog/></section>;
}
