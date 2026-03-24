// ── State ─────────────────────────────────────────────────────────────────
let memberCount = 0;
const roles = ["Frontend Dev","Backend Dev","Fullstack Dev","DevOps","QA Engineer","UI/UX Designer","Data Engineer","Project Manager","Tech Lead","Mobile Dev"];
const seniorities = ["Junior","Mid","Senior","Lead"];
const avatarColors = ["#6c63ff","#ff6584","#43b89c","#f59e0b","#3b82f6","#8b5cf6","#10b981","#f97316"];

// ── Team builder ──────────────────────────────────────────────────────────
function addMember(){
  memberCount++;
  const id = memberCount;
  const color = avatarColors[(id-1) % avatarColors.length];
  const el = document.createElement("div");
  el.className = "member-card";
  el.id = `member-${id}`;
  el.innerHTML = `
    <div class="member-header">
      <div style="display:flex;align-items:center;gap:8px">
        <div class="avatar" id="av-${id}" style="background:${color}">?</div>
        <div class="member-name-display" id="nd-${id}">New Member</div>
      </div>
      <button class="remove-btn" onclick="removeMember(${id})" title="Remove">✕</button>
    </div>
    <div class="member-fields">
      <div class="field" style="margin:0">
        <label>Full Name</label>
        <input type="text" placeholder="e.g. Alice Martin" oninput="updateMemberDisplay(${id},this.value)" onchange="updateMemberDisplay(${id},this.value)"/>
      </div>
      <div class="field" style="margin:0">
        <label>Role</label>
        <select>
          ${roles.map(r=>`<option>${r}</option>`).join("")}
        </select>
      </div>
      <div class="field" style="margin:0;grid-column:1/-1">
        <label>Seniority</label>
        <select>
          ${seniorities.map(s=>`<option>${s}</option>`).join("")}
        </select>
      </div>
    </div>`;
  document.getElementById("team-list").appendChild(el);
}

function removeMember(id){
  document.getElementById(`member-${id}`)?.remove();
}

function updateMemberDisplay(id, val){
  const name = val.trim() || "New Member";
  document.getElementById(`nd-${id}`).textContent = name;
  document.getElementById(`av-${id}`).textContent = name.split(" ").map(p=>p[0]).join("").slice(0,2).toUpperCase();
}

function getTeam(){
  return [...document.getElementById("team-list").querySelectorAll(".member-card")].map(card=>{
    const inputs = card.querySelectorAll("input,select");
    return {
      name: inputs[0].value.trim() || "Unknown",
      role: inputs[1].value,
      seniority: inputs[2].value,
    };
  });
}

// ── Generate ──────────────────────────────────────────────────────────────
async function generate(){
  const name = document.getElementById("project-name").value.trim();
  const desc = document.getElementById("project-desc").value.trim();
  if(!name || !desc){ alert("Please fill in project name and description."); return; }
  const team = getTeam();
  if(team.length === 0){ alert("Please add at least one team member."); return; }

  const btn = document.getElementById("gen-btn");
  btn.disabled = true;
  document.getElementById("spinner").style.display = "block";
  document.getElementById("btn-label").textContent = "Generating…";
  document.getElementById("empty-state").style.display = "none";
  document.getElementById("results").style.display = "none";

  const payload = {
    project_name: name,
    project_description: desc,
    tech_stack: document.getElementById("tech-stack").value.trim(),
    sprint_duration_weeks: parseInt(document.getElementById("sprint-duration").value),
    sprint_count: parseInt(document.getElementById("sprint-count").value),
    team,
  };

  try {
    const res = await fetch("/api/generate-sprints",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify(payload),
    });
    if(!res.ok){
      const err = await res.json();
      throw new Error(err.detail || "Server error");
    }
    const data = await res.json();
    renderResults(data);
  } catch(e){
    document.getElementById("empty-state").style.display = "flex";
    document.getElementById("results").innerHTML = `<div class="error-box">⚠️ <strong>Error:</strong> ${e.message}</div>`;
    document.getElementById("results").style.display = "block";
  } finally {
    btn.disabled = false;
    document.getElementById("spinner").style.display = "none";
    document.getElementById("btn-label").textContent = "Generate Sprints";
  }
}

// ── Render ────────────────────────────────────────────────────────────────
function initials(name){ return (name||"?").split(" ").map(p=>p[0]).join("").slice(0,2).toUpperCase(); }
function avatarColor(name){
  let h = 0; for(const c of (name||"")) h = (h<<5) - h + c.charCodeAt(0);
  return avatarColors[Math.abs(h) % avatarColors.length];
}

function renderResults(data){
  const container = document.getElementById("results");
  const totalTasks = data.sprints.reduce((s,sp)=>s+sp.tasks.length,0);
  const totalSP = data.sprints.reduce((s,sp)=>s+sp.tasks.reduce((a,t)=>a+(t.story_points||0),0),0);

  let html = `
    <div class="project-header">
      <h2>${esc(data.project_name)}</h2>
      <p>${esc(data.summary||"")}</p>
      <div class="stats-row">
        <div class="stat-chip">📅 ${data.sprints.length} sprints <span>/ ${data.total_weeks}w total</span></div>
        <div class="stat-chip">✅ ${totalTasks} tasks</div>
        <div class="stat-chip">⚡ ${totalSP} story points</div>
        <div class="stat-chip">👥 ${Object.keys(data.sprints[0]?.team_workload||{}).length} members</div>
      </div>
    </div>

    <div class="tabs" id="tabs">
      <button class="tab active" onclick="switchTab('sprints')">Sprints & Tasks</button>
      <button class="tab" onclick="switchTab('workload')">Workload Overview</button>
      <button class="tab" onclick="switchTab('recs')">Recommendations</button>
    </div>

    <!-- SPRINTS TAB -->
    <div class="tab-content active" id="tab-sprints">
      ${data.sprints.map(sp => renderSprintCard(sp)).join("")}
    </div>

    <!-- WORKLOAD TAB -->
    <div class="tab-content" id="tab-workload">
      ${renderWorkloadOverview(data)}
    </div>

    <!-- RECS TAB -->
    <div class="tab-content" id="tab-recs">
      <div class="rec-list">
        ${(data.recommendations||[]).map(r=>`<div class="rec-item">💡 ${esc(r)}</div>`).join("")}
      </div>
    </div>`;

  container.innerHTML = html;
  container.style.display = "block";
}

function renderSprintCard(sp){
  const spTotal = sp.tasks.reduce((a,t)=>a+(t.story_points||0),0);
  return `
    <div class="sprint-card">
      <div class="sprint-card-header">
        <div>
          <div class="sprint-title">Sprint ${sp.sprint_number} · Week ${sp.start_week}–${sp.end_week}</div>
          <div class="sprint-goal">${esc(sp.goal)}</div>
        </div>
        <div class="sprint-meta">
          <div class="badge badge-purple">${sp.tasks.length} tasks</div>
          <div class="badge badge-teal">${spTotal} SP</div>
        </div>
      </div>
      <div class="sprint-body">
        <div style="overflow-x:auto">
          <table class="task-table">
            <thead><tr>
              <th>ID</th><th>Task</th><th>Assignee</th><th>Type</th><th>Priority</th><th>SP</th>
            </tr></thead>
            <tbody>
              ${sp.tasks.map(t=>`
                <tr>
                  <td class="task-id">${esc(t.id)}</td>
                  <td>
                    <div class="task-title">${esc(t.title)}</div>
                    <div class="task-desc">${esc(t.description)}</div>
                  </td>
                  <td>
                    <div class="assignee-tag">
                      <div class="avatar" style="background:${avatarColor(t.assignee)}">${initials(t.assignee)}</div>
                      ${esc(t.assignee)}
                    </div>
                  </td>
                  <td><span class="type-badge type-${t.type||"Feature"}">${esc(t.type||"Feature")}</span></td>
                  <td class="prio-${t.priority||"Medium"}">${esc(t.priority||"Medium")}</td>
                  <td><div class="sp-pill">${t.story_points||1}</div></td>
                </tr>`).join("")}
            </tbody>
          </table>
        </div>

        <div style="margin-top:14px">
          <div style="font-size:.75rem;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--muted);margin-bottom:10px">Team workload this sprint</div>
          <div class="member-sprint-grid">
            ${Object.entries(sp.team_workload||{}).map(([name,wl])=>`
              <div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:10px 12px">
                <div style="display:flex;align-items:center;gap:7px;margin-bottom:6px">
                  <div class="avatar" style="background:${avatarColor(name)};width:26px;height:26px;font-size:.7rem">${initials(name)}</div>
                  <strong style="font-size:.82rem">${esc(name)}</strong>
                </div>
                <div style="font-size:.75rem;color:var(--muted);margin-bottom:4px">${esc(wl.focus||"")}</div>
                <div style="font-size:.78rem;display:flex;justify-content:space-between">
                  <span>${wl.tasks_count} tasks</span>
                  <span style="color:var(--accent);font-weight:700">${wl.story_points} SP</span>
                </div>
              </div>`).join("")}
          </div>
        </div>
      </div>
    </div>`;
}

function renderWorkloadOverview(data){
  // Aggregate across all sprints
  const totals = {};
  data.sprints.forEach(sp=>{
    Object.entries(sp.team_workload||{}).forEach(([name,wl])=>{
      if(!totals[name]) totals[name]={tasks:0,sp:0,sprints:0};
      totals[name].tasks += wl.tasks_count||0;
      totals[name].sp += wl.story_points||0;
      totals[name].sprints++;
    });
  });
  const maxSP = Math.max(...Object.values(totals).map(v=>v.sp), 1);
  return `
    <div class="workload-grid">
      ${Object.entries(totals).map(([name,t])=>`
        <div class="workload-card">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
            <div class="avatar" style="background:${avatarColor(name)};width:32px;height:32px;font-size:.75rem">${initials(name)}</div>
            <h4>${esc(name)}</h4>
          </div>
          <div class="wl-stat"><span>${t.tasks} total tasks</span><strong>${t.sp} SP</strong></div>
          <div class="wl-bar"><div class="wl-fill" style="width:${Math.round(t.sp/maxSP*100)}%"></div></div>
          <div class="wl-stat" style="font-size:.75rem;color:var(--muted)">
            <span>Avg / sprint</span>
            <span>${(t.sp/data.sprints.length).toFixed(1)} SP · ${(t.tasks/data.sprints.length).toFixed(1)} tasks</span>
          </div>
        </div>`).join("")}
    </div>`;
}

// ── Tabs ──────────────────────────────────────────────────────────────────
function switchTab(id){
  document.querySelectorAll(".tab-content").forEach(el=>el.classList.remove("active"));
  document.querySelectorAll(".tab").forEach(el=>el.classList.remove("active"));
  document.getElementById(`tab-${id}`).classList.add("active");
  document.querySelectorAll(".tab").forEach(el=>{
    if(el.getAttribute("onclick")?.includes(id)) el.classList.add("active");
  });
}

// ── Utils ─────────────────────────────────────────────────────────────────
function esc(s){ const d=document.createElement("div");d.textContent=String(s||"");return d.innerHTML; }

// ── Init: add 3 default members ───────────────────────────────────────────
addMember(); addMember(); addMember();