export const residentModules=[
 {id:'overview',name:'个人概览',icon:'home',group:'我的小镇',description:'你的身份、待办与小镇动态，一览可见。'},
 {id:'learning',name:'我的学习',icon:'book',group:'学习与共创',description:'在AI学院持续学习，记录每一步成长。',districts:['learning-campus'],areas:[['我的班级','班级成员身份、班级公告与学习安排。'],['课程与公开课','已加入课程、公开课与继续学习入口。'],['学习记录','学习进度、作业提交与学习证书。']]},
 {id:'enterprise',name:'我的企业与共创',icon:'building',group:'学习与共创',description:'在AI创业园找到伙伴，一起把想法变成作品。',districts:['office-campus'],areas:[['我的企业','所属企业、成员身份与企业资料。'],['共创项目','参与的项目、成员分工与协作记录。'],['园区入驻','企业及OPC客户的入驻申请与办理进度。']]},
 {id:'works',name:'我的作品与店铺',icon:'shop',group:'学习与共创',description:'在AI商业街展示创意，让作品与更多人相遇。',districts:['creative-street'],areas:[['我的作品','作品展示、发布记录与收藏。'],['我的店铺','店铺资料、经营身份与管理入口。'],['商品与服务','商品和AI服务的维护与展示。']]},
 {id:'tasks',name:'我的任务与活动',icon:'task',group:'参与与生活',description:'从一项任务、一场活动开始，参与小镇共创。',districts:['task-square','town-square'],areas:[['我参与的任务','任务报名、参与进度与成果提交。'],['我的活动','AI广场及任务广场的活动报名与日程。'],['成果与反馈','提交记录、处理结果与活动回顾。']]},
 {id:'community',name:'我的社区',icon:'people',group:'参与与生活',description:'在AI社区遇见伙伴，分享你的小镇生活。',districts:['ai-community'],areas:[['社区资料','居民社区名片与个人介绍。'],['我的小组','加入的小组、交流空间与成员信息。'],['社区互动','社区活动、交流与参与记录。']]},
 {id:'services',name:'我的服务',icon:'service',group:'身份与账户',description:'跟进申请、处理补充材料，查看服务消息与授权资料。'},
 {id:'identities',name:'我的身份',icon:'badge',group:'身份与账户',description:'管理荣誉与权限称号，决定你在小镇里如何被看见。'},
 {id:'settings',name:'账户与形象',icon:'settings',group:'身份与账户',description:'更新个人资料，选择喜欢的形象。'}
] as const;
export type ResidentSection=typeof residentModules[number]['id'];
export function residentSection(value:string|null):ResidentSection{return residentModules.find(m=>m.id===value)?.id||'overview';}
export function workbenchHref(section:ResidentSection,view?:string){return `/account?section=${section}${view?`&view=${encodeURIComponent(view)}`:''}`;}
