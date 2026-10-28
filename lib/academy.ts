/** External school discovery only: no enrollment or progress is recorded here. */
export type ExternalCourse = {id:string;title:string;summary:string;url:string;coverAssetId:string|null;sort:number;published:boolean;revision:number;createdAt:string;updatedAt:string};
export type AcademyCatalog = {courses:ExternalCourse[]};
export type AcademyManaged = AcademyCatalog;
export type AcademyAsset = {id:string;name:string;mime:string;bytes:number;status:'pending'|'approved'|'disabled';createdAt:string};
