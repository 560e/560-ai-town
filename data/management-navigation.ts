export const managementSections = [
  {id:"overview",name:"运营概览",group:"工作台",icon:"⌂",description:"查看小镇账户概况与最近的运营记录。",status:"live"},
  {id:"residents",name:"居民管理",group:"用户管理",icon:"◎",description:"查看居民资料与操作记录，管理账户的使用状态。",status:"live"},
  {id:"civic-hall",name:"AI服务中心",group:"版块管理",icon:"◇",description:"身份称号、动态申请、审核授予和展示板内容。",status:"live"},
  {id:"learning-campus",name:"AI学院",group:"版块管理",icon:"▤",description:"站外课程、链接、封面与发布管理。",status:"live"},
  {id:"office-campus",name:"AI创业园",group:"版块管理",icon:"▧",description:"OPC团队、共创项目与园区入驻。",status:"planned"},
  {id:"creative-street",name:"AI商业街",group:"版块管理",icon:"▦",description:"店铺、AI工具、作品与展示状态。",status:"planned"},
  {id:"task-square",name:"任务广场",group:"版块管理",icon:"☑",description:"任务、活动、参与记录与成果审核。",status:"planned"},
  {id:"ai-community",name:"AI社区",group:"版块管理",icon:"♧",description:"社区公告、话题与内容审核。",status:"planned"},
  {id:"town-square",name:"五六零AI广场",group:"版块管理",icon:"◈",description:"公共公告、推荐内容与新手导览。",status:"planned"},
  {id:"welcome",name:"欢迎页与公司介绍",group:"内容运营",icon:"▣",description:"维护欢迎页文案、公司简介与展示说明。",status:"planned"},
  {id:"announcements",name:"公告管理",group:"内容运营",icon:"≡",description:"管理公告的展示位置、发布与下架。",status:"planned"},
  {id:"npc",name:"NPC话语",group:"内容运营",icon:"◌",description:"按街区维护与当前场景相符的随机话语。",status:"planned"},
  {id:"moderation",name:"敏感词管理",group:"内容运营",icon:"◈",description:"维护多人公开发言与私聊的屏蔽词库、导入和测试拦截规则。",status:"live"},
  {id:"activity",name:"我的工作记录",group:"工作记录",icon:"↺",description:"查看当前账户的管理操作与登录记录。",status:"live"},
] as const;
export type ManagementSectionId=typeof managementSections[number]["id"];
export function managementSection(value:string|null|undefined){return managementSections.find(section=>section.id===value)||managementSections[0];}

