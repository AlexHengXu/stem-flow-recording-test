const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
function element(){return {hidden:false,textContent:'',dataset:{},style:{},children:[],setAttribute(){},insertBefore(el){this.children.push(el)},append(...xs){this.children.push(...xs)},classList:{values:{},toggle(name,on){this.values[name]=on}},getContext(){return {}},querySelector(s){return this.map[s]}}}
const canvas=element(),value=element(),feedback=element(),sprites=element(),card=element(),shell=element();
card.map={'canvas':canvas,'output':value,'p':feedback,'.tutorial-gestures':sprites};shell.firstElementChild=card;
const recording=element();
const next=element(),pause=element(),status=element(),session=element(),start=element(),song=element();status.textContent='Change volume';
const body=element();let timer,created=0;
const context={window:{},location:{search:''},URLSearchParams,requestAnimationFrame(){},matchMedia:()=>({matches:false}),document:{hidden:false,body,createElement(tag){return created++===0?shell:element()},getElementById(id){return {recordingSettings:recording,introNext:next,introPause:pause,introStatus:status,sessionIntro:session,startButton:start,songSelect:song,enableButton:element(),retrySong:element()}[id]}},
 Image:class{complete=false;naturalWidth=0},state:{phase:'ready',volumes:[.55]},selectedSession:'intro',intro:{active:false,step:0,done:false},
 handPrompt:{textContent:'Show your hand'},fxAmount:()=>.73,setInterval(fn){timer=fn},pauseGame(){context.state.phase='paused'},skipIntroAll(){context.intro.active=false;context.state.phase='mix'}};
vm.runInNewContext(fs.readFileSync(__dirname+'/js/flowie-tutorial.js','utf8'),context);
assert(shell.hidden,'setup must not be covered');
context.state.phase='join';timer();assert(!shell.hidden);assert(next.hidden);assert.equal(feedback.textContent,'Show your hand');
context.state.phase='intro';context.intro.active=true;next.disabled=true;timer();assert.equal(value.textContent,'Volume 55%');assert(next.disabled,'visual layer must not unlock Next');
context.state.volumes[0]=.32;timer();assert.equal(value.textContent,'Volume 32%');
context.intro.step=3;timer();assert.equal(value.textContent,'Delay 73%');assert.equal(value.dataset.zone,'bottom-left');
context.state.phase='paused';timer();assert(shell.hidden,'pause controls must remain accessible');
context.state.phase='intro';context.intro.done=true;timer();assert(feedback.textContent.startsWith('Nice!'));
context.intro.step=6;timer();assert(value.hidden);assert(feedback.textContent.includes('Start remix'));
context.intro.active=false;context.state.phase='mix';timer();assert(shell.hidden,'gameplay must not remain covered');
context.state.phase='join';context.selectedSession='intro';timer();card.children.find(e=>e.className==='tutorial-skip').onclick();assert.equal(context.selectedSession,'mix');assert(shell.hidden);
created=0;context.location.search='?flowie=done&lesson=1';context.state.phase='setup';context.intro.active=false;context.startButton=start;start.disabled=true;context.menuHint={textContent:'Allow camera'};context.songStatus={textContent:'Loading song'};
vm.runInNewContext(fs.readFileSync(__dirname+'/js/flowie-tutorial.js','utf8'),context);
assert(!shell.hidden);assert(!recording.hidden);assert(shell.classList.values["choosing-song"]);assert(card.children.includes(recording),'original recording controls must be in the visible card');assert(session.checked);assert.equal(start.textContent,'Begin tutorial');assert(feedback.textContent.includes('Allow camera'));
context.state.phase='ready';start.disabled=false;timer();assert(feedback.textContent.includes('Begin tutorial'));
context.state.phase='join';context.selectedSession='intro';timer();assert(!shell.classList.values['choosing-song']);assert(recording.hidden);assert(!shell.hidden);
context.state.phase='mix';timer();assert(shell.hidden);assert(recording.hidden);
console.log('PASS: tutorial visibility, real-state value feedback, Next ownership, pause, final step and skip during countdown.');
