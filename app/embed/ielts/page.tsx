"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

function useTimer(sec: number) {
  const [s, setS] = useState(sec);
  useEffect(() => {
    const t = setInterval(() => setS(v => Math.max(0, v - 1)), 1000);
    return () => clearInterval(t);
  }, []);
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return { s, label: `${mm}:${ss}` };
}

export default function Page() {
  const [attemptId, setAttemptId] = useState<string>("");
  const [phase, setPhase] = useState<"gate"|"L"|"R"|"W"|"finish"|"done">("gate");
  const [userEmail, setUserEmail] = useState("");
  const [subtabL, setSubtabL] = useState("A1");
  const [subtabR, setSubtabR] = useState("A1");
  const [LItems, setLItems] = useState<any[]>([]);
  const [RItems, setRItems] = useState<any[]>([]);
  const [answersL, setAnswersL] = useState<Record<number, string>>({});
  const [answersR, setAnswersR] = useState<Record<number, string>>({});
  const [WTask1, setWTask1] = useState("");
  const [WTask2, setWTask2] = useState("");
  const { label: timerL } = useTimer(35*60);
  const { label: timerR } = useTimer(60*60);
  const { label: timerW } = useTimer(60*60);
  const gridRef = useRef<HTMLDivElement>(null);

  async function createAttempt() {
    const r = await fetch("/api/createAttempt", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ user_email: userEmail, test_id: `IELTS-A-${Date.now()}` }) });
    const j = await r.json();
    setAttemptId(j.attemptId);
  }

  async function loadL() {
    const r = await fetch(`/api/items?skill=L&subtab=${encodeURIComponent(subtabL)}`);
    const j = await r.json();
    setLItems(j.items || []);
  }

  async function loadR() {
    const r = await fetch(`/api/items?skill=R&subtab=${encodeURIComponent(subtabR)}`);
    const j = await r.json();
    setRItems(j.items || []);
  }

  useEffect(() => {
    const t = setInterval(async () => {
      if (!attemptId) return;
      if (phase === "L") {
        const arr = Object.entries(answersL).map(([k,v]) => ({ q_no: Number(k), response: v }));
        if (arr.length) await fetch("/api/saveSkillOverwrite", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ attemptId, skill: "L", answers: arr }) });
      }
      if (phase === "R") {
        const arr = Object.entries(answersR).map(([k,v]) => ({ q_no: Number(k), response: v }));
        if (arr.length) await fetch("/api/saveSkillOverwrite", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ attemptId, skill: "R", answers: arr }) });
      }
      if (phase === "W") {
        await fetch("/api/saveSkillOverwrite", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ attemptId, skill: "W", answers: [{ q_no: 1, response: WTask1 }, { q_no: 2, response: WTask2 }] }) });
      }
    }, 10000);
    return () => clearInterval(t);
  }, [attemptId, phase, answersL, answersR, WTask1, WTask2]);

  function keyHandler(e: KeyboardEvent) {
    if (!gridRef.current) return;
    const qs = gridRef.current.querySelectorAll("[data-q]");
    const active = Array.from(qs).findIndex(x => x.classList.contains("active"));
    if (e.key === "]") {
      const i = Math.min(qs.length - 1, active + 1);
      qs.forEach(x => x.classList.remove("active"));
      (qs[i] as HTMLElement)?.scrollIntoView({ behavior: "smooth", block: "start" });
      (qs[i] as HTMLElement)?.classList.add("active");
    }
    if (e.key === "[") {
      const i = Math.max(0, active - 1);
      qs.forEach(x => x.classList.remove("active"));
      (qs[i] as HTMLElement)?.scrollIntoView({ behavior: "smooth", block: "start" });
      (qs[i] as HTMLElement)?.classList.add("active");
    }
    if (/^[1-5]$/.test(e.key)) {
      const map: any = { "1": "A", "2": "B", "3": "C", "4": "D", "5": "E" };
      const node = qs[active] as HTMLElement;
      if (node) {
        const q = Number(node.getAttribute("data-q") || "0");
        if (phase === "L") setAnswersL(s => ({ ...s, [q]: map[e.key] }));
        if (phase === "R") setAnswersR(s => ({ ...s, [q]: map[e.key] }));
      }
    }
  }

  useEffect(() => {
    window.addEventListener("keydown", keyHandler);
    return () => window.removeEventListener("keydown", keyHandler);
  }, [phase]);

  async function goFinish() {
    await fetch("/api/finalizeAttempt", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ attemptId, endedBy: "user", subtabL, subtabR }) });
    setPhase("done");
  }

  return (
    <div style={{maxWidth:1300,margin:"0 auto",height:"100vh",display:"flex",flexDirection:"column",fontFamily:"system-ui,Segoe UI,Roboto,Inter"}}>
      <header style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",borderBottom:"1px solid #e5e5e5",position:"sticky",top:0,background:"#fff",zIndex:2}}>
        <h1 style={{fontSize:16,margin:0,fontWeight:600,flex:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>IELTS Mock Test</h1>
        {phase==="L"&&<div style={{border:"1px solid #e5e5e5",borderRadius:999,padding:"6px 10px"}}>{timerL}</div>}
        {phase==="R"&&<div style={{border:"1px solid #e5e5e5",borderRadius:999,padding:"6px 10px"}}>{timerR}</div>}
        {phase==="W"&&<div style={{border:"1px solid #e5e5e5",borderRadius:999,padding:"6px 10px"}}>{timerW}</div>}
        {phase!=="gate"&&phase!=="done"&&<button onClick={goFinish} style={{border:"1px solid #e5e5e5",borderRadius:10,padding:"8px 12px",background:"#f7f7f7",cursor:"pointer"}}>Submit</button>}
      </header>

      {phase==="gate"&&(
        <div style={{padding:20,display:"grid",gap:12}}>
          <input placeholder="Email" value={userEmail} onChange={e=>setUserEmail(e.target.value)} style={{padding:10,border:"1px solid #e5e5e5",borderRadius:10}}/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div><label>Listening Set</label><input value={subtabL} onChange={e=>setSubtabL(e.target.value)} style={{width:"100%",padding:10,border:"1px solid #e5e5e5",borderRadius:10}}/></div>
            <div><label>Reading Set</label><input value={subtabR} onChange={e=>setSubtabR(e.target.value)} style={{width:"100%",padding:10,border:"1px solid #e5e5e5",borderRadius:10}}/></div>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={async()=>{await createAttempt(); await loadL(); setPhase("L");}} style={{border:"1px solid #e5e5e5",borderRadius:10,padding:"10px 14px",background:"#000",color:"#fff",cursor:"pointer"}}>Start Listening</button>
          </div>
        </div>
      )}

      {phase==="L"&&(
        <div style={{display:"grid",gridTemplateColumns:"minmax(320px,1fr) minmax(300px,0.8fr)",gap:14,padding:14,height:"100%"}}>
          <section className="panel" style={{border:"1px solid #e5e5e5",borderRadius:12,overflow:"auto",minHeight:0}}>
            <div style={{padding:16}}>
              <div dangerouslySetInnerHTML={{__html: (LItems[0]?.passage_html||"")}} />
            </div>
          </section>
          <aside className="panel" style={{border:"1px solid #e5e5e5",borderRadius:12,overflow:"auto",minHeight:0}}>
            <div className="grid" ref={gridRef} style={{padding:12, display:"grid", gap:12}}>
              {Array.from({length:40},(_,i)=>i+1).map(q=>(
                <div key={q} data-q={q} style={{borderBottom:"1px dashed #e5e5e5",paddingBottom:8}}>
                  <div style={{fontWeight:600,marginBottom:6}}>Q{q}</div>
                  <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                    {["A","B","C","D","E"].map(o=>(
                      <button key={o} onClick={()=>setAnswersL(s=>({...s,[q]:o}))} style={{border:"1px solid #e5e5e5",borderRadius:8,padding:"8px 10px",background:(answersL[q]===o?"#000":"#fff"),color:(answersL[q]===o?"#fff":"#000"),cursor:"pointer"}}>{o}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div style={{padding:12,borderTop:"1px solid #e5e5e5"}}>
              <button onClick={async()=>{await fetch("/api/saveSkillOverwrite",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({attemptId,skill:"L",answers:Object.entries(answersL).map(([k,v])=>({q_no:Number(k),response:String(v)}))})}); await loadR(); setPhase("R");}} style={{border:"1px solid #e5e5e5",borderRadius:10,padding:"10px 14px",background:"#f7f7f7",cursor:"pointer"}}>Next: Reading</button>
            </div>
          </aside>
        </div>
      )}

      {phase==="R"&&(
        <div style={{display:"grid",gridTemplateColumns:"minmax(320px,1fr) minmax(300px,0.8fr)",gap:14,padding:14,height:"100%"}}>
          <section style={{border:"1px solid #e5e5e5",borderRadius:12,overflow:"auto",minHeight:0}}>
            <div style={{padding:16}}>
              <div dangerouslySetInnerHTML={{__html: (RItems[0]?.passage_html||"")}} />
            </div>
          </section>
          <aside style={{border:"1px solid #e5e5e5",borderRadius:12,overflow:"auto",minHeight:0}}>
            <div ref={gridRef} style={{padding:12, display:"grid", gap:12}}>
              {Array.from({length:40},(_,i)=>i+1).map(q=>(
                <div key={q} data-q={q} style={{borderBottom:"1px dashed #e5e5e5",paddingBottom:8}}>
                  <div style={{fontWeight:600,marginBottom:6}}>Q{q}</div>
                  <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                    {["A","B","C","D","E"].map(o=>(
                      <button key={o} onClick={()=>setAnswersR(s=>({...s,[q]:o}))} style={{border:"1px solid #e5e5e5",borderRadius:8,padding:"8px 10px",background:(answersR[q]===o?"#000":"#fff"),color:(answersR[q]===o?"#fff":"#000"),cursor:"pointer"}}>{o}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div style={{padding:12,borderTop:"1px solid #e5e5e5"}}>
              <button onClick={async()=>{await fetch("/api/saveSkillOverwrite",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({attemptId,skill:"R",answers:Object.entries(answersR).map(([k,v])=>({q_no:Number(k),response:String(v)}))})}); setPhase("W");}} style={{border:"1px solid #e5e5e5",borderRadius:10,padding:"10px 14px",background:"#f7f7f7",cursor:"pointer"}}>Next: Writing</button>
            </div>
          </aside>
        </div>
      )}

      {phase==="W"&&(
        <div style={{display:"grid",gridTemplateColumns:"minmax(320px,1fr) minmax(300px,0.8fr)",gap:14,padding:14,height:"100%"}}>
          <section style={{border:"1px solid #e5e5e5",borderRadius:12,overflow:"auto",minHeight:0}}>
            <div style={{padding:16}}>
              <h3>Task 1</h3>
              <div style={{margin:"8px 0"}}>Summarize the information...</div>
              <h3>Task 2</h3>
              <div>Write an essay...</div>
            </div>
          </section>
          <aside style={{border:"1px solid #e5e5e5",borderRadius:12,overflow:"auto",minHeight:0}}>
            <div style={{padding:12}}>
              <div style={{fontWeight:600,marginBottom:8}}>Task 1</div>
              <textarea value={WTask1} onChange={e=>setWTask1(e.target.value)} style={{width:"100%",height:180,border:"1px solid #e5e5e5",borderRadius:10,padding:10}}/>
              <div style={{fontWeight:600,margin:"16px 0 8px"}}>Task 2</div>
              <textarea value={WTask2} onChange={e=>setWTask2(e.target.value)} style={{width:"100%",height:220,border:"1px solid #e5e5e5",borderRadius:10,padding:10}}/>
            </div>
            <div style={{padding:12,borderTop:"1px solid #e5e5e5"}}>
              <button onClick={goFinish} style={{border:"1px solid #e5e5e5",borderRadius:10,padding:"10px 14px",background:"#f7f7f7",cursor:"pointer"}}>Finish</button>
            </div>
          </aside>
        </div>
      )}

      {phase==="done"&&(
        <div style={{padding:20}}>
          <h3>Submitted</h3>
          <p>Results for Listening/Reading will be computed and saved. Writing is queued.</p>
        </div>
      )}
    </div>
  );
}
