export const hairStyles=[{id:'short',name:'清爽短发'},{id:'side',name:'侧分短发'},{id:'bob',name:'利落短波波'},{id:'pony',name:'活力马尾'},{id:'bun',name:'圆圆丸子头'},{id:'spiky',name:'俏皮刺猬头'}] as const;
export const hairColors=[{id:'ink',name:'墨棕',color:'#403831'},{id:'chestnut',name:'栗棕',color:'#845039'},{id:'honey',name:'蜂蜜金',color:'#dca44c'},{id:'auburn',name:'暖红棕',color:'#b66648'},{id:'silver',name:'银灰',color:'#b5bdc8'},{id:'blue',name:'雾蓝',color:'#597b99'}] as const;
export const shirtColors=[{id:'green',name:'新芽绿',color:'#24bd65'},{id:'blue',name:'海湾蓝',color:'#218fc9'},{id:'teal',name:'青碧',color:'#29b5ad'},{id:'coral',name:'珊瑚橙',color:'#ed8973'},{id:'sun',name:'暖阳黄',color:'#edbd46'},{id:'lavender',name:'浅紫',color:'#a79bd5'},{id:'cream',name:'奶油白',color:'#f1e8cf'},{id:'rose',name:'蔷薇粉',color:'#d992b0'}] as const;
export type CharacterAppearance={hairStyle:typeof hairStyles[number]['id'];hairColor:typeof hairColors[number]['id'];shirtColor:typeof shirtColors[number]['id']};
export const defaultAppearance:CharacterAppearance={hairStyle:'short',hairColor:'ink',shirtColor:'green'};
export function appearanceInput(value:unknown):CharacterAppearance{
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('请选择有效的角色形象');
 const v=value as Record<string,unknown>;
 if(Object.keys(v).some(key=>!['hairStyle','hairColor','shirtColor'].includes(key))||!hairStyles.some(x=>x.id===v.hairStyle)||!hairColors.some(x=>x.id===v.hairColor)||!shirtColors.some(x=>x.id===v.shirtColor))throw new Error('请选择有效的发型、发色和衣服颜色');
 return {hairStyle:v.hairStyle, hairColor:v.hairColor,shirtColor:v.shirtColor} as CharacterAppearance;
}
export function savedAppearance(value:unknown):CharacterAppearance{try{return appearanceInput(value);}catch{return {...defaultAppearance};}}
export function normalizeNickname(value:unknown){return typeof value==='string'?value.normalize('NFKC').trim().replace(/ +/g,' '):'';}
