const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
let player;const events={},button={style:{},setAttribute(){}};
class Audio{constructor(src){this.src=src;this.paused=true;this.listeners={};player=this;}play(){this.paused=false;return Promise.resolve()}pause(){this.paused=true}addEventListener(n,f){this.listeners[n]=f}}
const c={Audio,window:{addEventListener(){}},sessionStorage:{getItem:()=>null,setItem(){}},document:{hidden:false,body:{append(){}},createElement:()=>button,addEventListener(n,f){events[n]=f}}};
vm.runInNewContext(fs.readFileSync(__dirname+'/js/ambient-music.js','utf8'),c);
assert(player.paused);events.pointerdown();assert(!player.paused);assert.equal(player.volume,.16);
c.window.StemAmbient.setStage('tutorial');assert(player.paused);assert(button.hidden);events.keydown();assert(player.paused,'tutorial interaction cannot restart music');
c.window.StemAmbient.setStage('paused');assert(player.paused);
c.window.StemAmbient.setStage('tutorial');assert(player.paused);c.document.hidden=true;events.visibilitychange();c.document.hidden=false;events.visibilitychange();assert(player.paused,'returning to tutorial must stay silent');
button.onclick();assert(player.paused);c.window.StemAmbient.setStage('welcome');assert(player.paused,'mute persists across stages');button.onclick();assert(!player.paused);
c.window.StemAmbient.setStage('game');assert(player.paused);assert(button.hidden);events.keydown();assert(player.paused,'game interaction cannot restart ambient music');
console.log('PASS: gesture unlock, silent tutorial, pause, persistent mute and no ambient music during remix');
