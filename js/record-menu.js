/* v14-based recording menu: prepare capture before moving the song timeline. */
(() => {
  const button=document.getElementById('recordMenuButton');
  const choices=document.getElementById('recordChoices');
  const now=document.getElementById('recordFromNow');
  const restart=document.getElementById('recordFromStart');
  const back=document.getElementById('recordBack');
  const save=document.getElementById('recordSave');
  const status=document.getElementById('recordMenuStatus');
  let busy=false,expanded=false,captureId=null,lastView=null;
  try {
    if(navigator.mediaDevices?.setCaptureHandleConfig){
      const id=crypto.randomUUID();
      navigator.mediaDevices.setCaptureHandleConfig({handle:id,permittedOrigins:[location.origin]});
      captureId=id;
    }
  } catch (_) {}
  function validateCapture(stream){
    const track=stream?.getVideoTracks()[0];
    if(!track||track.readyState!=='live')throw Error('No live game capture. Please try again.');
    if(captureId&&typeof track.getCaptureHandle==='function'&&track.getCaptureHandle()?.handle!==captureId)
      throw Error('Choose this Stem Flow game tab in the sharing dialog, then try again.');
  }
  function refresh(){
    const eligible=state.phase==='paused'&&pausedFrom==='mix';
    const active=!!mediaRecorder&&mediaRecorder.state!=='inactive';
    const view=[eligible,active,expanded,busy,recordToggle.disabled,!!mediaRecorder].join(':');
    if(view===lastView)return;lastView=view;
    button.hidden=!eligible||active||expanded;
    button.disabled=busy||recordToggle.disabled||!!mediaRecorder;
    choices.hidden=!eligible||!expanded||active;
    save.hidden=!eligible||!active;
    now.disabled=restart.disabled=back.disabled=save.disabled=busy;
    status.hidden=!eligible;
    for(const id of ['continueButton','restartButton','endButton'])document.getElementById(id).disabled=busy;
    if(eligible&&!busy&&!status.textContent)status.textContent=recordToggle.disabled?recordFormatHint.textContent:'Record the game, camera and remix audio as MP4.';
  }
  // Wait for actual captured video frames, not just a DOM animation callback.
  async function waitForGameFrame(stream){
    validateCapture(stream);
    const preview=document.createElement('video');preview.muted=true;preview.playsInline=true;preview.srcObject=stream;
    let frameId,timer;
    try {
      await Promise.race([preview.play(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('The game capture did not start. Return to the game tab and try again.')),6000);})]);
      clearTimeout(timer);
      await new Promise((resolve,reject)=>{
        timer=setTimeout(()=>reject(Error('The game capture is not updating. Keep the game tab visible and retry.')),6000);
        let frames=0,last=-1;
        const tick=()=>{
          if(preview.readyState>=2&&preview.currentTime!==last){last=preview.currentTime;frames++;}
          if(frames>=2){clearTimeout(timer);resolve();return;}
          frameId=preview.requestVideoFrameCallback?preview.requestVideoFrameCallback(tick):requestAnimationFrame(tick);
        };
        frameId=preview.requestVideoFrameCallback?preview.requestVideoFrameCallback(tick):requestAnimationFrame(tick);
      });
      validateCapture(stream);
    } finally {
      clearTimeout(timer);
      if(preview.cancelVideoFrameCallback)preview.cancelVideoFrameCallback(frameId);else cancelAnimationFrame(frameId);
      preview.pause();preview.srcObject=null;
    }
  }
  async function seekPlayers(times){
    await Promise.all(Object.entries(players).map(([key,player])=>new Promise((resolve,reject)=>{
      const target=times[key];
      if(Math.abs(player.currentTime-target)<.001&&!player.seeking){resolve();return;}
      let timer;
      const cleanup=()=>{clearTimeout(timer);player.removeEventListener('seeked',done);player.removeEventListener('error',failed);};
      const done=()=>{cleanup();resolve();};const failed=()=>{cleanup();reject(Error('Song could not seek. Please try again.'));};
      player.addEventListener('seeked',done,{once:true});player.addEventListener('error',failed,{once:true});
      timer=setTimeout(failed,6000);player.currentTime=target;
    })));
  }
  async function begin(mode){
    if(busy||!['now','restart'].includes(mode)||state.phase!=='paused'||pausedFrom!=='mix'||recordToggle.disabled||mediaRecorder)return;
    const originalTimes=Object.fromEntries(Object.entries(players).map(([k,p])=>[k,p.currentTime]));
    busy=true;recordToggle.checked=true;status.textContent='Choose this Stem Flow game tab to record.';refresh();
    let moved=false;
    try {
      await prepareScreenRecording();validateCapture(screenStream);
      await audioContext.resume();
      if(mode==='restart'){moved=true;await seekPlayers(Object.fromEntries(Object.keys(players).map(k=>[k,0])));}
      // Display the game while audio remains paused. Input is locked until ready.
      hideOverlay(helpOverlay);helpOverlay.inert=true;hideOverlay(pauseOverlay);hideOverlay(endingOverlay);
      state.phase='mix';resetGestureControls();introRender();updateUI();
      await waitForGameFrame(screenStream);
      state.recordPerformance=true;startPerformanceRecording();
      if(!mediaRecorder||mediaRecorder.state!=='recording')throw Error(recordFormatHint.textContent||'MP4 recording could not start.');
      playAll();window.StemAmbient?.setStage('game');
      document.getElementById('instruction').textContent='Recording · Space pauses · End or Stop & save downloads MP4';
      status.textContent='Recording paused. Continue resumes this file; Stop & save downloads it.';expanded=false;
    } catch(error){
      stopPerformanceRecording(true);pauseAll();state.recordPerformance=false;recordToggle.checked=false;releaseScreenCapture();
      if(moved){try{await seekPlayers(originalTimes);}catch(_){}}
      state.phase='paused';pausedFrom='mix';showOverlay(pauseOverlay);introRender();
      status.textContent=error.name==='NotAllowedError'?'Sharing cancelled. Your song position has not changed.':error.message;
    } finally {busy=false;refresh();updateUI();}
  }
  button.onclick=()=>{expanded=true;status.textContent='Continue from the current position, or restart the song. Both record game + camera + remix audio.';refresh();};
  back.onclick=()=>{expanded=false;refresh();};
  now.onclick=()=>begin('now');restart.onclick=()=>begin('restart');
  save.onclick=()=>{if(busy)return;stopPerformanceRecording(true);recordToggle.checked=false;state.recordPerformance=false;expanded=false;status.textContent='Saving MP4…';refresh();};
  window.StemRecordMenu={refresh,validateCapture,begin,get busy(){return busy;}};refresh();
})();
