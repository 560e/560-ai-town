/** Academy presentation text; all geometry lives in academy-campus.ts. */
export {campusStations as academyStations} from './academy-campus.ts';
export type AcademyPanel='catalog'|'student-chat'|'guide'|'assistant'|'librarian'|'helper'|'announcement'|'classes'|'library'|'lecture'|'student';
export const academyDialogues={
 'student-chat':['我在浏览学院的课程目录，你想先从哪类 AI 课程开始？','课程会在新标签页打开，课程资料以对应平台实际提供的内容为准。','学累了可以在广场坐一会儿。校园活动还在筹备，我们先看看感兴趣的课程吧。'],
 guide:['欢迎来到五六零AI学院！从学校公告牌了解课程，沿步道向北就是AI教学楼。','还没确定学习方向？可以先浏览课程名称和简介，再前往合适的课程平台。','校园里的图书馆和讲堂提供课程导览，尚未开放的业务会明确说明。'],
 assistant:['这里是AI教学楼。正门和左侧打开课程目录，右侧查看学习服务说明。','课程在新标签页打开，小镇校园会留在原来的位置；学习进度由课程所在平台管理。','班级教学还在筹备中，目前可以浏览已发布的站外课程。'],
 librarian:['欢迎来到AI图书馆。这里可以浏览学院发布的课程入口。','找模板或参考资料时，先看看课程介绍；具体资料和访问规则以对应课程平台为准。','独立知识库还在筹备中。阅读长椅可以按E坐下，祝你今天有所收获。'],
 helper:['这里是学生中心，可以了解学习服务并浏览课程目录。','小镇不记录或同步站外课程的学习进度，请在课程所在平台查看。','班级通知、学习日历和个人学习计划尚未开放。'],
};
export const academyGuide=academyDialogues.guide;
