export type BadgeStyle={colors:string[];text:string;border:string};
export const identityPresets:Record<string,{name:string;style:BadgeStyle}>={
 resident:{name:'居民浅灰',style:{colors:['#F1F5F9','#DDE5ED'],text:'#475569',border:'#A8B8C8'}},
 bronze:{name:'铜牌',style:{colors:['#FDE5CD','#EBC098'],text:'#74451F',border:'#C18B58'}},
 silver:{name:'银牌',style:{colors:['#F5FAFF','#CAD9E8'],text:'#425C78',border:'#8FA9C2'}},
 gold:{name:'金牌',style:{colors:['#FFF4BE','#F3D16D'],text:'#755210',border:'#D4AA37'}},
 blue:{name:'海蓝',style:{colors:['#DFF6FF','#A6DCF5'],text:'#165B82',border:'#67B5DA'}},
 green:{name:'翡翠',style:{colors:['#DDF9E9','#A9E6CE'],text:'#23684E',border:'#68B99A'}},
 purple:{name:'浅紫',style:{colors:['#F3EAFE','#DAC4F5'],text:'#65458B',border:'#B199D7'}},
 rainbow:{name:'炫彩',style:{colors:['#BFEAFF','#DED0FA','#FFE1B6'],text:'#4C4A76',border:'#B2AAD9'}}
};
export type IdentityBadge={id:string;name:string;style:BadgeStyle;expiresAt:string|null};
export const residentBadge:IdentityBadge={id:'resident',name:'小镇居民',style:identityPresets.resident.style,expiresAt:null};
export type IdentityChoice=IdentityBadge&{allowed:boolean;kind:'resident'|'honor'|'permission'};
export type IdentityPreferences={version:number;selected:string[];choices:IdentityChoice[]};
export function validateBadgeStyle(value:unknown):BadgeStyle{
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('称号配色格式无效');
 const s=value as BadgeStyle;
 if(Object.keys(s).some(k=>!['colors','text','border'].includes(k))||!Array.isArray(s.colors)||s.colors.length<1||s.colors.length>3||[...s.colors,s.text,s.border].some(c=>typeof c!=='string'||!/^#[0-9a-f]{6}$/i.test(c)))throw Error('配色需要1–3个背景色、文字色和边框色，使用六位十六进制颜色');
 return {colors:[...s.colors],text:s.text,border:s.border};
}
export function validateIdentitySelection(value:unknown):string[]{
 if(!Array.isArray(value)||value.length>10||new Set(value).size!==value.length||value.some(id=>typeof id!=='string'||(id!=='resident'&&!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))))throw Error('最多展示10个不同身份（包含小镇居民）');
 return [...value];
}
export function badgeBackground(style:BadgeStyle){return style.colors.length===1?style.colors[0]:`linear-gradient(120deg, ${style.colors.join(', ')})`;}
export function activeBadges(badges:IdentityBadge[],now=Date.now()){return badges.filter(b=>!b.expiresAt||Date.parse(b.expiresAt)>now).slice(0,10);}
