"use client";

import { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import countryData from "../../../public/database/countries.json";
import SiteHeader from "../../components/SiteHeader";
import WorldMap from "../../components/WorldMap";

type Country = { name: string; population: number; owner: string; troops: number; originalTroops: number; alive: boolean };
type LogItem = { id: number; title: string; detail: string; kind: "system" | "battle" | "npc" | "good" };
type BattleState = { attacker: string; defender: string; committed: number };
type BattleRecord = { id: string; round: number; attacker: string; defender: string; attackerDice: number[]; defenderDice: number[]; attackerLosses: number; defenderLosses: number; outcome: string; commentary: string };
type Game = { gameId?: string; playerCountry: string; countries: Country[]; turnOrder: string[]; turnIndex: number; round: number; log: LogItem[]; winner: string | null; nextLogId: number; attackUsed: boolean; battleHistory: BattleRecord[]; activeBattle: BattleState | null };
const palette = ["#D5AE62","#5D9EBD","#A77BC6","#6EA88C","#D17E6D","#8D9BCB","#B7A36C","#68AEB0","#C17EAA","#9AAB74"];
const populationTroops = (p:number) => p <= 5_000_000 ? 1 : p <= 10_000_000 ? 2 : p <= 25_000_000 ? 3 : p <= 50_000_000 ? 4 : p <= 75_000_000 ? 5 : p <= 100_000_000 ? 6 : p <= 125_000_000 ? 7 : p <= 150_000_000 ? 8 : 9;
const fmt = (n:number) => new Intl.NumberFormat("en-US").format(n);
const sample = <T,>(arr:T[], n:number) => [...arr].sort(()=>Math.random()-.5).slice(0,n);
const idFor = (s:string) => s.toLowerCase().replace(/[^a-z]/g,"");

export default function Home() {
  const { isLoaded: clerkLoaded, isSignedIn } = useUser();
  const [selected,setSelected]=useState("South Africa");
  const [game,setGame]=useState<Game|null>(null);
  const [target,setTarget]=useState("");
  const [committed,setCommitted]=useState(1);
  const [transfer,setTransfer]=useState(1);
  const [allocations,setAllocations]=useState<Record<string,number>>({});
  const [battle,setBattle]=useState<{attacker:string;defender:string;committed:number}|null>(null);
  const [speed,setSpeed]=useState(false);
  const [notice,setNotice]=useState("");
  const [saved,setSaved]=useState(false);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{
    let cancelled=false;
    const restoreLocal=()=>{
      try{const raw=localStorage.getItem("unampire-save");if(raw&&!cancelled){const local=JSON.parse(raw) as Game;setGame({...local,attackUsed:local.attackUsed??false,battleHistory:local.battleHistory??[],activeBattle:local.activeBattle??null});setBattle(local.activeBattle??null);setSaved(true);}}catch{}
      if(!cancelled)setLoading(false);
    };
    fetch("/api/games",{cache:"no-store"}).then(async response=>{if(!response.ok)throw new Error("Cloud save unavailable");return response.json();}).then(data=>{
      if(cancelled)return;
      if(data?.game){const restored=data.game as Game;setGame({...restored,attackUsed:restored.attackUsed??false,battleHistory:restored.battleHistory??[],activeBattle:restored.activeBattle??null});setBattle(restored.activeBattle??null);setSaved(true);localStorage.setItem("unampire-save",JSON.stringify(restored));}
      else restoreLocal();
      setLoading(false);
    }).catch(restoreLocal);
    return ()=>{cancelled=true};
  },[]);
  useEffect(()=>{if(game)localStorage.setItem("unampire-save",JSON.stringify(game));},[game]);
  useEffect(()=>{
    if(!game?.gameId)return;
    const timer=setTimeout(()=>{fetch("/api/games",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({gameId:game.gameId,game})}).then(async response=>{
      if(!response.ok){const body=await response.json().catch(()=>({}));if(response.status===401)setNotice("Sign in to save this campaign to your account. A browser copy is still available.");else setNotice(body.error??"Cloud save failed. Your browser copy remains available.");}else setSaved(true);
    }).catch(()=>setNotice("Could not reach Firestore. Your browser copy remains available."));},700);
    return ()=>clearTimeout(timer);
  },[game]);

  const currentName=game?.turnOrder[game.turnIndex] ?? "";
  const isPlayerTurn=!!game && currentName===game.playerCountry && !game.winner;
  const owned=useMemo(()=>game?.countries.filter(c=>c.owner===game.playerCountry)??[],[game]);
  const activeCountries=game?.countries.filter(c=>c.alive)??[];
  const playerAlive=owned.length>0;

  function pushLog(g:Game,title:string,detail:string,kind:LogItem["kind"]="system") {
    g.log=[{id:g.nextLogId++,title,detail,kind},...g.log].slice(0,80);
  }
  function startGame() {
    if(!clerkLoaded||!isSignedIn){setNotice("Please sign in or register before starting a campaign.");return;}
    const chosen=countryData.find(c=>c.name===selected) ?? countryData[0];
    const others=sample(countryData.filter(c=>c.name!==chosen.name),9);
    const selectedCountries=[chosen,...others];
    const turnOrder=selectedCountries.map(c=>c.name).sort(()=>Math.random()-.5);
    const list:Country[]=selectedCountries.map((c,i)=>({name:c.name,population:c.population,owner:c.name,troops:populationTroops(c.population),originalTroops:populationTroops(c.population),alive:true}));
    const g:Game={gameId:crypto.randomUUID(),playerCountry:chosen.name,countries:list,turnOrder,turnIndex:0,round:1,log:[],winner:null,nextLogId:1,attackUsed:false,battleHistory:[],activeBattle:null};
    pushLog(g,"NEW CAMPAIGN","Ten nations enter the world theatre. The first commander has been selected at random.");
    pushLog(g,"YOUR NATION",`${chosen.name} begins with ${populationTroops(chosen.population)} troop(s). Your objective is to control all ten nations.`,"good");
    const first=turnOrder[0]; pushLog(g,"FIRST TURN",`${first} has been randomly selected to act first.`);
    setGame(g);setBattle(null);setTarget("");setNotice("Campaign created. Check the turn order to see who moves first.");
  }
  function updateCountry(g:Game,name:string,patch:Partial<Country>) {
    g.countries=g.countries.map(c=>c.name===name?{...c,...patch}:c);
  }
  function nextTurn(g:Game) {
    if(g.winner)return;
    let idx=(g.turnIndex+1)%g.turnOrder.length;
    let round=g.round+(idx===0?1:0);
    let tries=0;
    while(tries<g.turnOrder.length && !g.countries.some(c=>c.owner===g.turnOrder[idx]&&c.alive)){idx=(idx+1)%g.turnOrder.length;tries++;}
    g.turnIndex=idx;g.round=round;
    const name=g.turnOrder[idx];
    g.attackUsed=false;
    if(round>=2 && g.countries.some(c=>c.owner===name&&c.alive)){
      const bonus=g.countries.filter(c=>c.owner===name&&c.alive).length*2;
      pushLog(g,"REINFORCEMENTS",`${name} receives ${bonus} troops (${g.countries.filter(c=>c.owner===name&&c.alive).length} territories × 2).`,"good");
      if(name===g.playerCountry) setAllocations({});
      else {
        let remaining=bonus;
        const ownedNow=g.countries.filter(c=>c.owner===name&&c.alive).sort((a,b)=>a.troops-b.troops);
        for(const c of ownedNow){if(!remaining)break;const add=Math.min(remaining,Math.max(1,Math.ceil(bonus/ownedNow.length)));updateCountry(g,c.name,{troops:c.troops+add});remaining-=add;}
        if(remaining&&ownedNow.length)updateCountry(g,ownedNow[0].name,{troops:ownedNow[0].troops+remaining});
      }
    }
    pushLog(g,"TURN BEGINS",`${name} is now active.`,name===g.playerCountry?"good":"npc");
  }
  function finishPlayerTurn() {
    if(!isSignedIn){setNotice("Sign in to take turns.");return;}
    if(!game||!isPlayerTurn)return;
    const g=structuredClone(game) as Game;
    const total=Object.values(allocations).reduce((a,b)=>a+b,0);
    const due=g.round>=2?owned.length*2:0;
    if(total>due){setNotice(`You have allocated ${total}, but only ${due} reinforcement troops are available.`);return;}
    if(due>0 && total<due){setNotice(`Allocate all ${due} reinforcement troops before ending your turn.`);return;}
    Object.entries(allocations).forEach(([name,n])=>{const c=g.countries.find(x=>x.name===name);if(c&&n>0)updateCountry(g,name,{troops:c.troops+n});});
    pushLog(g,"PLAYER TURN ENDED",`${g.playerCountry} has completed its turn.`);nextTurn(g);setGame(g);setTarget("");setNotice("");
  }
  function resolveVolley() {
    if(!isSignedIn){setNotice("Sign in to resolve battles.");return;}
    if(!game||!battle)return;
    const g=structuredClone(game) as Game;
    let a=g.countries.find(c=>c.name===battle.attacker)!;
    let d=g.countries.find(c=>c.name===battle.defender)!;
    const diceCount=Math.min(battle.committed,a.troops-1,d.troops);
    const attackDice=diceCount;
    const defendDice=diceCount;
    const ad=Array.from({length:attackDice},()=>1+Math.floor(Math.random()*6)).sort((x,y)=>y-x);
    const dd=Array.from({length:defendDice},()=>1+Math.floor(Math.random()*6)).sort((x,y)=>y-x);
    let al=0,dl=0;const pairs=[];
    for(let i=0;i<Math.min(ad.length,dd.length);i++){if(ad[i]>dd[i]){dl++;pairs.push(`Attacker ${ad[i]} beats defender ${dd[i]}.`)}else if(ad[i]<dd[i]){al++;pairs.push(`Defender ${dd[i]} beats attacker ${ad[i]}.`)}else pairs.push(`Both roll ${ad[i]}: tie, no loss.`);}
    a={...a,troops:a.troops-al};d={...d,troops:d.troops-dl};
    updateCountry(g,a.name,{troops:a.troops});updateCountry(g,d.name,{troops:d.troops});
    const commentary=pairs.join(" ");
    g.battleHistory=[...(g.battleHistory??[]),{id:`r${g.round}-b${g.battleHistory.length+1}`,round:g.round,attacker:a.name,defender:d.name,attackerDice:ad,defenderDice:dd,attackerLosses:al,defenderLosses:dl,outcome:d.troops<=0?"defender-defeated":"volley-resolved",commentary}].slice(-200);
    pushLog(g,"BATTLE VOLLEY",`${a.name} rolls [${ad.join(", ")}] against ${d.name} [${dd.join(", ")}]. ${commentary}`, "battle");
    if(a.troops<=1){
      updateCountry(g,d.name,{troops:Math.max(1,d.troops)});
      pushLog(g,"ATTACK ENDED",`${a.name} has one troop remaining. The attack ends and ${d.name} retains its territory.`);
      g.activeBattle=null;setBattle(null);setTarget("");setGame(g);setNotice("Your attack has ended because only one troop remains. The defender keeps the territory.");return;
    }
    if(d.troops<=0){
      const bonus=Math.max(2,Math.floor(d.originalTroops/2));
      updateCountry(g,a.name,{troops:a.troops+bonus});
      updateCountry(g,d.name,{owner:a.owner,troops:0,alive:true});
      const available=Math.max(1,a.troops+bonus-1);
      const conquestBattle={attacker:a.name,defender:d.name,committed:available};
      g.activeBattle=conquestBattle;setBattle(conquestBattle);
      pushLog(g,"TERRITORY CONQUERED",`${a.name} captures ${d.name}. ${bonus} additional troops are awarded. Choose how many to transfer into the new territory.`, "good");
      setTransfer(Math.min(available,Math.max(1,bonus)));
      setNotice(`Conquest! ${bonus} additional troops awarded. Choose how many to move into ${d.name}.`);
      setGame(g);return;
    }
    const nextBattle={...battle,committed:Math.min(battle.committed,a.troops-1)};
    g.activeBattle=nextBattle;setBattle(nextBattle);setGame(g);setNotice("Volley resolved. Continue the attack or stop here.");
  }
  function stopAttack() {
    if(!isSignedIn){setNotice("Sign in to manage this battle.");return;}
    if(!battle||!game)return;
    const g=structuredClone(game) as Game;
    if(g.countries.find(c=>c.name===battle.defender)?.troops===0){setNotice("Secure the conquered territory before continuing.");return;}
    pushLog(g,"ATTACK STOPPED",`${battle.attacker} stops attacking ${battle.defender}.`);
    g.activeBattle=null;setBattle(null);setTarget("");setGame(g);setNotice("Attack stopped. You may end your turn or transfer troops.");
  }
  function completeConquest() {
    if(!isSignedIn){setNotice("Sign in to secure this territory.");return;}
    if(!game||!battle)return;
    const g=structuredClone(game) as Game;
    const a=g.countries.find(c=>c.name===battle.attacker)!;
    const d=g.countries.find(c=>c.name===battle.defender)!;
    const bonus=Math.max(2,Math.floor(d.originalTroops/2));
    const move=Math.min(transfer,Math.max(0,a.troops-1));
    updateCountry(g,a.name,{troops:a.troops-move});
    updateCountry(g,d.name,{owner:a.owner,troops:Math.max(1,move),alive:true});
    pushLog(g,"CONQUEST SECURED",`${move} troops move from ${a.name} into ${d.name}. ${a.owner} now controls ${g.countries.filter(c=>c.owner===a.owner).length} territories.`,"good");
    g.activeBattle=null;setBattle(null);setTarget("");setGame(g);setNotice("Territory secured. You can end your turn when ready.");
    const owners=[...new Set(g.countries.map(c=>c.owner))];
    if(owners.length===1){g.winner=owners[0];pushLog(g,"VICTORY",`${owners[0]} controls the entire world theatre!`,"good");setGame(g);}
  }
  function playerAttack() {
    if(!isSignedIn){setNotice("Sign in to attack.");return;}
    if(!game||!target||!isPlayerTurn)return;
    if(game.attackUsed){setNotice("You have already used your one attack this turn.");return;}
    const from=game.countries.find(c=>c.owner===game.playerCountry&&c.troops>=2);
    const defender=game.countries.find(c=>c.name===target);
    if(!from||!defender||defender.owner===game.playerCountry)return;
    const newBattle={attacker:from.name,defender:target,committed:from.troops-1};
    setBattle(newBattle);setNotice(`Attack initiated from ${from.name} against ${target}.`);
    const g=structuredClone(game) as Game;g.attackUsed=true;g.activeBattle=newBattle;pushLog(g,"ATTACK DECLARED",`${from.name} launches an attack on ${target}.`,"battle");setGame(g);
  }
  function npcTurn(g:Game) {
    const npc=g.turnOrder[g.turnIndex];
    const holdings=g.countries.filter(c=>c.owner===npc&&c.alive);
    const enemies=g.countries.filter(c=>c.owner!==npc&&c.alive);
    if(!holdings.length||!enemies.length){nextTurn(g);return;}
    const strongest=[...holdings].sort((a,b)=>b.troops-a.troops)[0];
    const weakest=[...enemies].sort((a,b)=>a.troops-b.troops)[0];
    if(strongest.troops>=weakest.troops+2&&strongest.troops>=2){
      g.attackUsed=true;
      pushLog(g,"NPC STRATEGY",`${npc} identifies ${weakest.name} as the weakest opposing territory (${weakest.troops} troops) and attacks from ${strongest.name} (${strongest.troops} troops).`,"npc");
      let source=g.countries.find(c=>c.name===strongest.name)!;
      let defender=g.countries.find(c=>c.name===weakest.name)!;
      let volleys=0;
      while(source.troops>1&&defender.troops>0&&volleys<20){
        const count=Math.min(source.troops-1,defender.troops);
        const ad=Array.from({length:count},()=>1+Math.floor(Math.random()*6)).sort((a,b)=>b-a);
        const dd=Array.from({length:count},()=>1+Math.floor(Math.random()*6)).sort((a,b)=>b-a);
        let attackerLosses=0,defenderLosses=0;
        const notes:string[]=[];
        for(let i=0;i<count;i++){
          if(ad[i]>dd[i]){defenderLosses++;notes.push(`attacker ${ad[i]} beats defender ${dd[i]}`);}
          else if(ad[i]<dd[i]){attackerLosses++;notes.push(`defender ${dd[i]} beats attacker ${ad[i]}`);}
          else notes.push(`both roll ${ad[i]}; tie`);
        }
        source={...source,troops:source.troops-attackerLosses};
        defender={...defender,troops:defender.troops-defenderLosses};
        updateCountry(g,source.name,{troops:source.troops});
        updateCountry(g,defender.name,{troops:Math.max(0,defender.troops)});
        const commentary=notes.join("; ");
        const outcome=source.troops<=1?"attacker-exhausted":defender.troops<=0?"defender-defeated":"volley-resolved";
        g.battleHistory=[...(g.battleHistory??[]),{id:`r${g.round}-npc-${g.battleHistory.length+1}`,round:g.round,attacker:source.name,defender:defender.name,attackerDice:ad,defenderDice:dd,attackerLosses,defenderLosses,outcome,commentary}].slice(-200);
        pushLog(g,"NPC BATTLE VOLLEY",`${npc}: ${source.name} rolls [${ad.join(", ")}] against ${defender.name} [${dd.join(", ")}]. ${commentary}.`,"battle");
        volleys++;
        if(source.troops<=1){
          updateCountry(g,defender.name,{troops:Math.max(1,defender.troops)});
          pushLog(g,"NPC ATTACK ENDED",`${npc}'s attacking territory is reduced to one troop. ${defender.name} retains its territory.`,"npc");
          break;
        }
        if(defender.troops<=0){
          const bonus=Math.max(2,Math.floor(defender.originalTroops/2));
          source={...source,troops:source.troops+bonus};
          const moved=Math.min(bonus,source.troops-1);
          updateCountry(g,source.name,{troops:source.troops-moved});
          updateCountry(g,defender.name,{owner:npc,troops:Math.max(1,moved),alive:true});
          pushLog(g,"NPC CONQUEST",`${npc} conquers ${defender.name}, receives ${bonus} additional troops and transfers ${moved} troops into the new territory.`,"npc");
          break;
        }
        if(source.troops<=defender.troops){
          pushLog(g,"NPC DECISION",`${npc} stops because its remaining force (${source.troops}) is not stronger than the defender (${defender.troops}).`,"npc");
          break;
        }
      }
    }else{
      const weakestOwn=[...holdings].sort((a,b)=>a.troops-b.troops)[0];
      updateCountry(g,weakestOwn.name,{troops:weakestOwn.troops+1});
      pushLog(g,"NPC DECISION",`${npc} avoids an unfavourable attack: strongest force ${strongest.troops}, weakest target ${weakest.troops}. It reinforces ${weakestOwn.name} instead.`,"npc");
    }
    const owners=[...new Set(g.countries.filter(c=>c.alive).map(c=>c.owner))];
    if(owners.length===1){g.winner=owners[0];pushLog(g,"VICTORY",`${g.winner} controls all ten nations.`,"good");}
    else nextTurn(g);
  }
  function advanceNpc() {
    if(!isSignedIn){setNotice("Sign in to take game turns.");return;}
    if(!game||isPlayerTurn||game.winner)return;
    const g=structuredClone(game) as Game;npcTurn(g);setGame(g);
  }
  function fastForward() {
    if(!isSignedIn){setNotice("Sign in to take game turns.");return;}
    if(!game||game.winner)return;
    const g=structuredClone(game) as Game;let steps=0;
    while(g.turnOrder[g.turnIndex]!==g.playerCountry&&!g.winner&&steps<20){npcTurn(g);steps++;}
    setGame(g);setSpeed(false);setNotice(`Fast-forward complete: ${steps} NPC turn(s) simulated. Every decision is recorded in the activity feed.`);
  }
  function transferTroops(from:string,to:string,amount:number) {
    if(!isSignedIn){setNotice("Sign in to transfer troops.");return;}
    if(!game||!isPlayerTurn)return;
    if(battle){setNotice("Finish or stop the current attack before transferring troops.");return;}
    const g=structuredClone(game) as Game;
    const a=g.countries.find(c=>c.name===from)!;const b=g.countries.find(c=>c.name===to)!;
    if(a.owner!==game.playerCountry||b.owner!==game.playerCountry||a.name===b.name||amount<1||a.troops-amount<1){setNotice("Transfer not possible. Both countries must be yours and the source must keep at least one troop.");return;}
    updateCountry(g,a.name,{troops:a.troops-amount});updateCountry(g,b.name,{troops:b.troops+amount});
    pushLog(g,"TROOPS TRANSFERRED",`${amount} troops move from ${from} to ${to}.`,"good");setGame(g);setNotice("Troop transfer completed.");
  }
  function reset() {if(!isSignedIn){setNotice("Sign in to manage this campaign.");return;}if(confirm("Delete this saved campaign and return to the title screen?")){if(game?.gameId)fetch("/api/games",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({gameId:game.gameId,game,status:"abandoned"})}).catch(()=>{});localStorage.removeItem("unampire-save");setGame(null);setBattle(null);setNotice("");setSaved(false);}}
  const currentTroops=game?.countries.find(c=>c.name===currentName)?.troops??0;
  const reinforcementDue=game&&isPlayerTurn&&game.round>=2?owned.length*2:0;
  const totalAllocated=Object.values(allocations).reduce((a,b)=>a+b,0);

  if(loading||!clerkLoaded)return <main className="app-shell"><SiteHeader/><section className="landing"><p className="lead">Loading your campaign…</p></section></main>;

  return <main className="app-shell">
    <SiteHeader />
    {!isSignedIn&&<div className="toast" role="status">Visitor mode: you can view the game, but must <Link href="/sign-in">sign in</Link> or <Link href="/sign-up">register</Link> to play.</div>}
    {!game ? <section className="landing">
        <div className="hero-text">
      <div className="eyebrow">A GEOPOLITICAL STRATEGY EXPERIENCE</div>
      <h1>ONE WORLD.<br/><em>TEN NATIONS.</em><br/>ONE EMPIRE.</h1>
      <p className="lead">Choose your nation. Build your forces. Outthink nine rival powers and bring the world under one banner.</p></div>
      <div className="start-layout">
        <div className="map-panel" id="world"><div className="panel-head"><div><small>THE WORLD THEATRE</small><h2>Choose your starting nation</h2></div><span className="live-tag">{countryData.length} NATIONS</span></div><WorldMap countries={countryData} selected={selected} onPick={setSelected}/><p className="map-hint">Select a highlighted nation on the map or use the list to begin.</p></div>
        <div className="setup-panel">
          <label htmlFor="country">YOUR NATION</label>
          <select id="country" value={selected} onChange={e=>setSelected(e.target.value)}>{countryData.map(c=><option key={c.name} value={c.name}>{c.name}</option>)}</select>
          <div className="nation-preview"><div className="crest">✦</div><div><small>SELECTED NATION</small><h3>{selected}</h3><p>{fmt(countryData.find(c=>c.name===selected)?.population??0)} population</p></div></div>
          <div className="rule-line"><span>Starting troops</span><b>{populationTroops(countryData.find(c=>c.name===selected)?.population??0)}</b></div>
          <div className="rule-line"><span>Opposing nations</span><b>9</b></div>
          <div className="rule-line"><span>Victory condition</span><b>10 / 10</b></div>
          <button className="primary-btn" onClick={startGame} disabled={!isSignedIn}>ESTABLISH CAMPAIGN <span>↗</span></button>
          {saved&&<button className="secondary-btn" onClick={()=>setNotice("Your previous campaign is saved in this browser. Start a new campaign to replace it.")}>Previous local save detected</button>}
          <p className="fine-print">A new campaign replaces the current browser save.</p>
        </div>
      </div>
      <div className="landing-foot"><span>UNAMPIRE · COMMAND YOUR DESTINY</span><span>DESIGNED FOR STRATEGIC THINKING</span></div>
    </section> : <section className="game-screen">
      <div className="game-heading"><div><div className="eyebrow">CAMPAIGN IN PROGRESS · ROUND {game.round}</div><h1>WORLD <em>COMMAND</em></h1><p>Lead {game.playerCountry}. Expand your influence across the theatre.</p></div><button className="secondary-btn reset-btn" onClick={reset}>RESET CAMPAIGN</button></div>
      <div className="metrics">
        <div><small>YOUR TERRITORIES</small><b>{owned.length}<span>/10</span></b></div>
        <div><small>YOUR TROOPS</small><b>{owned.reduce((s,c)=>s+c.troops,0)}</b></div>
        <div><small>ACTIVE NATIONS</small><b>{new Set(activeCountries.map(c=>c.owner)).size}<span>/10</span></b></div>
        <div><small>ROUND</small><b>{game.round.toString().padStart(2,"0")}</b></div>
      </div>
      <div className="game-grid">
        <div className="main-column">
          <div className="panel map-game" id="world"><div className="panel-head"><div><small>LIVE THEATRE</small><h2>Territory control map</h2></div><span className="live-tag">● LIVE CAMPAIGN</span></div><WorldMap countries={game.countries} ownerOrder={game.turnOrder}/><div className="legend">{game.turnOrder.map((n,i)=><span key={n}><i style={{background:palette[i%palette.length]}}/>{n}</span>)}</div></div>
          <div className="panel" id="command"><div className="panel-head"><div><small>YOUR COMMAND</small><h2>{game.winner?"Campaign concluded":isPlayerTurn?"Your turn":`${currentName}'s turn`}</h2></div><span className={`turn-chip ${isPlayerTurn?"your-turn":""}`}>{game.winner?"FINISHED":isPlayerTurn?"YOUR MOVE":"NPC ACTIVE"}</span></div>
            {game.winner?<div className="winner-box"><div className="crest large">✦</div><h3>{game.winner===game.playerCountry?"VICTORY":"DEFEAT"}</h3><p>{game.winner} controls all ten nations.</p></div>:isPlayerTurn?<div className="command-content">
              <p className="command-intro">Select an opposing nation to attack. You may launch one attack per turn, or skip and finish your turn.</p>
              {!battle?<div className="attack-row"><div className="field"><label>ATTACK TARGET</label><select value={target} onChange={e=>setTarget(e.target.value)}><option value="">Choose an opposing nation</option>{game.countries.filter(c=>c.owner!==game.playerCountry).map(c=><option key={c.name} value={c.name}>{c.name} · {c.troops} troops</option>)}</select></div><button className="primary-btn attack-btn" disabled={!target||game.attackUsed||owned.every(c=>c.troops<2)} onClick={playerAttack}>DECLARE ATTACK ↗</button></div>:<div className="battle-box"><div className="battle-title"><span>⚔ BATTLE IN PROGRESS</span><b>{battle.attacker} <i>VS</i> {battle.defender}</b></div><p>Dice per side: {Math.min(battle.committed,(game.countries.find(c=>c.name===battle.attacker)?.troops??1)-1,(game.countries.find(c=>c.name===battle.defender)?.troops??0))}</p><div className="battle-actions"><button className="primary-btn" onClick={resolveVolley}>ROLL NEXT VOLLEY</button><button className="secondary-btn" onClick={stopAttack}>STOP ATTACK</button></div>{game.countries.find(c=>c.name===battle.defender)?.troops===0&&<div className="conquest-choice"><label>MOVE TROOPS INTO CONQUERED TERRITORY</label><input type="range" min="1" max={Math.max(1,game.countries.find(c=>c.name===battle.attacker)!.troops-1)} value={transfer} onChange={e=>setTransfer(Number(e.target.value))}/><p>{transfer} troop(s) will move</p><button className="primary-btn" onClick={completeConquest}>SECURE TERRITORY</button></div>}</div>}
              {reinforcementDue>0&&<div className="reinforcement-box"><div><b>REINFORCEMENTS AVAILABLE</b><span>{reinforcementDue-totalAllocated} of {reinforcementDue} remaining to allocate</span></div>{owned.map(c=><label className="allocation" key={c.name}><span>{c.name} <small>({c.troops} troops)</small></span><input type="number" min="0" max={reinforcementDue} value={allocations[c.name]??0} onChange={e=>setAllocations({...allocations,[c.name]:Math.max(0,Number(e.target.value)||0)})}/></label>)}</div>}
              <div className="turn-actions"><button className="primary-btn" disabled={!!battle||(reinforcementDue>0&&totalAllocated!==reinforcementDue)} onClick={finishPlayerTurn}>END TURN →</button><span>{game.round===1?"No reinforcements in round one.":`${reinforcementDue} reinforcements to allocate.`}</span></div>
              <div className="transfer-box"><b>QUICK TROOP TRANSFER</b><div className="transfer-fields"><select id="transfer-from"><option value="">From territory</option>{owned.filter(c=>c.troops>1).map(c=><option key={c.name} value={c.name}>{c.name} ({c.troops})</option>)}</select><select id="transfer-to"><option value="">To territory</option>{owned.map(c=><option key={c.name} value={c.name}>{c.name}</option>)}</select><input id="transfer-amount" type="number" min="1" defaultValue="1"/></div><button className="secondary-btn" onClick={()=>{const f=(document.getElementById("transfer-from") as HTMLSelectElement).value;const t=(document.getElementById("transfer-to") as HTMLSelectElement).value;const n=Number((document.getElementById("transfer-amount") as HTMLInputElement).value);if(f&&t)transferTroops(f,t,n);}}>TRANSFER TROOPS</button><small>Source territory must retain at least one troop.</small></div>
            </div>:<div className="npc-panel"><div className="npc-orb">AI</div><div><b>{currentName} is evaluating the board</b><p>The simulated commander will assess troop strength, compare vulnerable targets and decide whether to attack or reinforce.</p></div><button className="primary-btn" onClick={advanceNpc}>RESOLVE NPC TURN →</button><button className="secondary-btn" onClick={fastForward}>FAST-FORWARD NPCs »</button></div>}
          </div>
          <div className="panel" id="chronicle"><div className="panel-head"><div><small>CAMPAIGN RECORD</small><h2>Battle & decision chronicle</h2></div><span className="live-tag">{game.log.length} EVENTS</span></div><div className="chronicle">{game.log.map(item=><article key={item.id} className={`log-item ${item.kind}`}><div className="log-mark">{item.kind==="battle"?"⚔":item.kind==="npc"?"AI":item.kind==="good"?"✦":"·"}</div><div><b>{item.title}</b><p>{item.detail}</p></div></article>)}</div></div>
        </div>
        <aside className="side-column"><div className="panel"><div className="panel-head"><div><small>POWER BALANCE</small><h2>Nation standings</h2></div></div><div className="standings">{[...game.countries].sort((a,b)=>b.troops-a.troops).map(c=><div className="standing" key={c.name}><i style={{background:palette[game.turnOrder.indexOf(c.owner)%palette.length]}}/><div><b>{c.name}</b><small>{c.owner===game.playerCountry?"YOUR NATION":"NPC POWER"}</small></div><strong>{c.troops}</strong></div>)}</div></div><div className="panel rules-panel"><small>FIELD MANUAL</small><h2>Rules of engagement</h2><ul><li>Every territory keeps at least one troop.</li><li>Attack any opponent; geography does not restrict targets.</li><li>Dice are compared in pairs. Higher roll wins; ties cause no loss.</li><li>Round two onward: receive two troops per owned territory.</li><li>Conquest bonus is at least two troops or half the territory's original force.</li><li>Control all ten nations to win.</li></ul></div></aside>
      </div>
      {notice&&<div className="toast" onClick={()=>setNotice("")}>{notice}<button>×</button></div>}
    </section>}
    <footer><span>UNAM<span className="footer-italic">pire</span></span><span>ONE WORLD. TEN NATIONS. ONE EMPIRE.</span></footer>
  </main>;
}
