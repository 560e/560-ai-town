"use client";
import Link from 'next/link';
import type {ReactNode} from 'react';
import {queueTownReturn,type TownDestination} from '@/data/town-navigation';
export default function TownReturnLink({destination,children,className}:{destination?:TownDestination;children:ReactNode;className?:string}){
 return <Link href="/" className={className} onClick={event=>{if(event.button===0&&!event.metaKey&&!event.ctrlKey&&!event.shiftKey&&!event.altKey)queueTownReturn(destination);}}>{children}</Link>;
}
