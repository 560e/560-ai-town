import {AsyncLocalStorage} from 'node:async_hooks';
const shared=globalThis as typeof globalThis & {townPasswordLogin?:AsyncLocalStorage<{userId:string;hash:string}>};
export const passwordLogin=shared.townPasswordLogin??=new AsyncLocalStorage<{userId:string;hash:string}>();
