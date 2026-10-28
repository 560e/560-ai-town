export type PanelHistory<T>={current:T;past:T[]};

// A successful save replaces the form: Back must not reopen a submitted draft.
export function navigatePanel<T>(state:PanelHistory<T>,next:T,replace=false):PanelHistory<T>{
 if(JSON.stringify(state.current)===JSON.stringify(next))return state;
 return {current:next,past:replace?state.past:[...state.past,state.current]};
}
export function backPanel<T>(state:PanelHistory<T>):PanelHistory<T>{
 if(!state.past.length)return state;
 return {current:state.past[state.past.length-1],past:state.past.slice(0,-1)};
}
