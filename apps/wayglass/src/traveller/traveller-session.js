// Ephemeral journey control. Kernel identity and durable continuity are not owned here.
export const WORLDS = Object.freeze([
 Object.freeze({id:'moonshore',name:'Shore of Three Moons',subtitle:'Moonlight and water',description:'A quiet shore beneath three moons. The horizon waits for you.',sky:0x081629,ground:0x1c343c,glow:0xb8e1d6,accent:0xdac28e,provenance:'Locally rendered environment, not a live sky feed.'}),
 Object.freeze({id:'dreaming-grove',name:'The Dreaming Grove',subtitle:'Lanterns among the trees',description:'A hushed grove of luminous trees. Rest here without needing to go anywhere.',sky:0x0a1e1a,ground:0x23382f,glow:0x91e3ac,accent:0xba8b57,provenance:'Locally rendered environment, distinct reality identity preserved.'}),
 Object.freeze({id:'star-harbour',name:'The Star Harbour',subtitle:'An observatory beyond the clouds',description:'Copper arches and a still sea of stars. Nothing moves until you ask.',sky:0x090e25,ground:0x1c243a,glow:0x98b6e8,accent:0xd4ab73,provenance:'Locally rendered environment, not measured astronomical imagery.'})
]);
export class TravellerSession {
 #world=WORLDS[0]; #entered=false; #paused=true; #x=0; #z=5; #heading=0;
 snapshot(){return Object.freeze({schema:'wayglass.traveller-view/v0.1',world:this.#world,world_id:this.#world.id,entered:this.#entered,paused:this.#paused,x:this.#x,z:this.#z,heading:this.#heading,kernel_receipt:null,authority:'ephemeral-browser-view'});}
 enter(id=this.#world.id){const next=WORLDS.find(w=>w.id===id);if(!next)throw new Error('Unknown Traveller destination');this.#world=next;this.#entered=true;this.#paused=false;this.#x=0;this.#z=5;this.#heading=0;return this.snapshot();}
 feather(){this.#paused=true;return this.snapshot();}
 resume(){if(this.#entered)this.#paused=false;return this.snapshot();}
 step(amount=1.2){if(!this.#entered||this.#paused||!Number.isFinite(amount))return this.snapshot();const a=Math.max(-1.5,Math.min(1.5,amount));this.#x=Math.max(-14,Math.min(14,this.#x+Math.sin(this.#heading)*a));this.#z=Math.max(-14,Math.min(14,this.#z-Math.cos(this.#heading)*a));return this.snapshot();}
 turn(amount){if(!this.#entered||this.#paused||!Number.isFinite(amount))return this.snapshot();const a=Math.max(-Math.PI/6,Math.min(Math.PI/6,amount));this.#heading=Math.atan2(Math.sin(this.#heading+a),Math.cos(this.#heading+a));return this.snapshot();}
}
