import type {PlayerState} from './town-runtime.ts';
import type {OnlineResident} from '../lib/multiplayer.ts';

/** Shared online state for spatial scenes. Scene-specific rendering remains local. */
export interface PresenceRuntime {
 player:PlayerState;
 remoteResidents?:OnlineResident[];
 visibleCharacterIds?:Set<string>;
 lastDestination:number;
 presenceSpawn?:string;
 talkingId?:string|null;
}
