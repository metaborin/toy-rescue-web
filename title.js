// Lightweight native title controls over the existing 3D room. No extra rendering loop.
(() => {
  const canvas=document.getElementById('game'),stage=document.getElementById('stage');
  const title=document.createElement('div');title.id='title-screen';title.hidden=true;
  title.innerHTML=`
    <div id="title-menu" aria-labelledby="title-heading">
      <div class="title-copy"><p class="title-tag">ちいさな ふたりの おおきな ぼうけん</p><h2 id="title-heading">おもちゃ<br>救助隊</h2><p class="title-sub">ふたりで、ただいま。</p><p class="title-note">ほんの丘の むこうで、なかまが まっている。<br>ロボットと ドローンで、たすけにいこう。</p><div class="title-actions"><button id="start-button" disabled>はじめる <span aria-hidden="true">→</span></button><button id="how-button">あそびかた</button></div></div>
      <div class="title-stamp"><b>キーボード ＋ マウス</b>おなじ パソコンで、ふたり</div>
      <div class="title-team" aria-label="ふたりの担当">
        <div><svg viewBox="0 0 70 70" aria-hidden="true"><path d="M35 7v8" stroke="#507869" stroke-width="3"/><circle cx="35" cy="7" r="4" fill="#83b393"/><rect x="14" y="15" width="42" height="29" rx="9" fill="#e7cc8b"/><rect x="20" y="22" width="30" height="15" rx="5" fill="#345953"/><rect x="26" y="26" width="5" height="7" rx="2" fill="#b7e4a3"/><rect x="39" y="26" width="5" height="7" rx="2" fill="#b7e4a3"/><path d="M19 47l-8 7m40-7 8 7" stroke="#d6ad64" stroke-width="7" stroke-linecap="round"/><rect x="22" y="44" width="26" height="18" rx="6" fill="#e7cc8b"/><circle cx="35" cy="52" r="4" fill="#4f8c7a"/><path d="M27 62v5m16-5v5" stroke="#345953" stroke-width="8" stroke-linecap="round"/></svg><span><strong>1P ロボット</strong>キーで あるく・おす</span></div>
        <div><svg viewBox="0 0 70 70" aria-hidden="true"><path d="M18 29 5 24m47 5 13-5" stroke="#779a89" stroke-width="3"/><ellipse cx="11" cy="22" rx="10" ry="5" fill="none" stroke="#e2bd70" stroke-width="3"/><ellipse cx="59" cy="22" rx="10" ry="5" fill="none" stroke="#e2bd70" stroke-width="3"/><ellipse cx="35" cy="36" rx="23" ry="18" fill="#e4b966"/><rect x="18" y="33" width="34" height="14" rx="6" fill="#345953"/><circle cx="27" cy="40" r="3" fill="#b7e4a3"/><circle cx="43" cy="40" r="3" fill="#b7e4a3"/><path d="M27 55q8 10 16 0" fill="none" stroke="#4c8c7c" stroke-width="3"/></svg><span><strong>2P ドローン</strong>マウスで つかむ・はこぶ</span></div>
      </div>
    </div>
    <div id="how-panel" role="dialog" aria-modal="true" aria-labelledby="how-heading" hidden>
      <h2 id="how-heading">ふたりで たすけよう</h2><p>キーボードと マウスを 分担して、声をかけあおう。</p>
      <div class="how-roles"><section class="how-role"><h3>1P ロボット</h3><p><kbd>W A S D</kbd> / <kbd>↑ ↓ ← →</kbd><br>あるく</p><p><kbd>E</kbd> ながおし<br>でんきや しかけを うごかす</p></section><section class="how-role drone"><h3>2P じりょくドローン</h3><p>マウスを うごかす<br>ねらう・とぶ</p><p>左ボタンを おしたまま うごかす<br>つかむ・はこぶ / はなすと おろす</p></section></div>
      <div class="how-example"><strong>さいしょは、じょうぎを はしに。</strong><br>ドローンが はこぶ → ロボットが わたる → ふたりで なかまを たすける！</div>
      <div class="how-footer"><p><kbd>Esc</kbd> ひとやすみ · 画面をクリックで さいかい<br><kbd>R</kbd> ながおしで 最初から · 落ちても すぐ もどれるよ</p><button id="how-back">タイトルへ もどる</button></div>
    </div>`;
  stage.appendChild(title);canvas.inert=true;canvas.tabIndex=-1;
  const menu=title.querySelector('#title-menu'),how=title.querySelector('#how-panel'),start=title.querySelector('#start-button'),help=title.querySelector('#how-button'),back=title.querySelector('#how-back');
  let instance,active=true,starting=false,fadeDone=false;const heldStartKeys=new Set();
  function focus(){(how.hidden?start:back).focus();}
  function closeHow(){how.hidden=true;menu.hidden=false;help.focus();}
  help.onclick=()=>{if(starting)return;menu.hidden=true;how.hidden=false;back.focus();};back.onclick=closeHow;
  function finish(){
    if(!starting||!fadeDone||heldStartKeys.size)return;
    active=false;title.hidden=true;canvas.inert=false;canvas.tabIndex=0;
    instance.SendMessage('ToyRescueRuntime','WebTitleReady');
    document.getElementById('pause').disabled=document.getElementById('sound').disabled=false;
    if(!document.hidden)canvas.focus();
  }
  start.onclick=()=>{
    if(!instance||starting||!how.hidden)return;
    starting=true;start.disabled=help.disabled=true;title.classList.add('leaving');
    instance.SendMessage('ToyRescueRuntime','WebStart');
    // Keep the click shield through a double click and until the start key is released.
    setTimeout(()=>{fadeDone=true;finish();},650);
  };
  document.addEventListener('keydown',event=>{
    if(event.code==='Space'||event.code==='Enter')heldStartKeys.add(event.code);
    if(!active||title.hidden)return;
    if(starting){event.preventDefault();event.stopPropagation();return;}
    // Unity also listens for these keys. Handle title buttons before its keyboard handler.
    if(event.code==='Space'||event.code==='Enter'){
      event.preventDefault();event.stopPropagation();
      const button=document.activeElement;
      if(!event.repeat&&[start,help,back].includes(button)&&!button.disabled)button.click();
      return;
    }
    if(event.key==='Escape'&&!how.hidden){event.preventDefault();closeHow();return;}
    if(event.key==='Tab'){
      const buttons=how.hidden?[start,help]:[back],index=buttons.indexOf(document.activeElement);
      event.preventDefault();buttons[(index+(event.shiftKey?-1:1)+buttons.length)%buttons.length].focus();
    }
  },true);
  document.addEventListener('keyup',event=>{
    heldStartKeys.delete(event.code);
    if(active&&(starting||event.code==='Space'||event.code==='Enter')){event.preventDefault();event.stopPropagation();finish();}
  },true);
  window.addEventListener('blur',()=>{heldStartKeys.clear();finish();});
  window.toyTitle={get active(){return active;},focus,
    ready(game){instance=game;title.hidden=false;start.disabled=false;focus();},
    hint(){return how.hidden?'「はじめる」で、ふたりの ぼうけんへ。':'担当をきめたら、タイトルへ もどろう。';}
  };
})();
