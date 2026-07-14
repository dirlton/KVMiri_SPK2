"use strict";

(function(){
  const SPK = window.SPK || (window.SPK = {});
  const storage = SPK.Storage;
  const config = SPK.Config || {};
  const ui = SPK.UI;

  const App = {
    modules: [],

    root(){
      const parts = location.pathname.split("/").filter(Boolean);
      const parent = parts.length > 1 ? parts[parts.length - 2] : "";
      return parent === "modules" || parent === "certificate" ? "../" : "";
    },

    async init(){
      this.applyTheme();
      this.enforceRegistration();
      await this.loadComponents();
      this.bindGlobalActions();
      await this.loadModules();
      this.renderConfigBadges();
      this.renderHome();
      this.renderDashboard();
      this.renderModulePage();
      this.renderProgressBadges();
      window.dispatchEvent(new Event("spk-app-ready"));
    },

    async fetchJson(path){
      const response = await fetch(this.root() + path);
      if(!response.ok){
        throw new Error(`Unable to load ${path}`);
      }
      return response.json();
    },

    async loadModules(){
      try{
        const data = await this.fetchJson("data/modules.json");
        this.modules = data.modules || [];
      }catch(error){
        console.error(error);
        this.modules = [];
      }
    },

    async loadComponents(){
      const targets = [
        ["navbar", "components/navbar.html"],
        ["footer", "components/footer.html"],
        ["progressbar", "components/progressbar.html"]
      ];

      for(const [id, file] of targets){
        const host = document.getElementById(id);
        if(!host) continue;
        try{
          const response = await fetch(this.root() + file);
          if(!response.ok) throw new Error(file);
          host.innerHTML = await response.text();
          this.normalizeComponentLinks(host);
        }catch(error){
          host.innerHTML = "";
        }
      }
    },

    normalizeComponentLinks(host){
      const root = this.root();
      host.querySelectorAll("[href^='/']").forEach((node)=>{
        node.setAttribute("href", root + node.getAttribute("href").slice(1));
      });
      host.querySelectorAll("[src^='/']").forEach((node)=>{
        node.setAttribute("src", root + node.getAttribute("src").slice(1));
        node.addEventListener("error", ()=>node.remove(), { once: true });
      });
    },

    bindGlobalActions(){
      document.addEventListener("click", (event)=>{
        const gatedLink = event.target.closest("a[href]");
        if(gatedLink && this.isGatedHref(gatedLink.getAttribute("href")) && !storage.isRegistered()){
          event.preventDefault();
          this.goToRegistration(gatedLink.getAttribute("href"));
          return;
        }

        const navToggle = event.target.closest("[data-nav-toggle]");
        if(navToggle){
          document.querySelector(".nav-menu")?.classList.toggle("show");
        }

        const themeToggle = event.target.closest("[data-theme-toggle]");
        if(themeToggle){
          if(config.ENABLE_DARK_MODE === false) return;
          const current = document.documentElement.dataset.theme || "light";
          const next = current === "dark" ? "light" : "dark";
          localStorage.setItem("spk-theme", next);
          this.applyTheme();
        }

        const reveal = event.target.closest("[data-reveal]");
        if(reveal){
          const panel = reveal.parentElement.querySelector(".reveal-content");
          panel?.classList.toggle("show");
        }

        const reset = event.target.closest("[data-reset-progress]");
        if(reset){
          event.preventDefault();
          const proceed = async ()=>{
            const confirmed = ui
              ? await ui.confirm({
                title: "Reset kemajuan",
                message: "Padam semua kemajuan latihan pada pelayar ini?",
                confirmText: "Padam"
              })
              : confirm("Padam semua kemajuan latihan pada pelayar ini?");
            if(confirmed){
              storage.reset();
              location.reload();
            }
          };
          proceed();
        }
      });

      window.addEventListener("spk-state-change", ()=>{
        this.renderProgressBadges();
        this.renderHome();
        this.renderDashboard();
      });
    },

    applyTheme(){
      if(config.ENABLE_DARK_MODE === false){
        document.documentElement.dataset.theme = "light";
        document.body.classList.remove("dark");
        return;
      }
      const theme = localStorage.getItem("spk-theme") || "light";
      document.documentElement.dataset.theme = theme;
      document.body.classList.toggle("dark", theme === "dark");
    },

    enforceRegistration(){
      if(!this.isRestrictedPage() || storage.isRegistered()) return;
      this.goToRegistration(this.currentRelativePath(), true);
    },

    currentRelativePath(){
      const parts = location.pathname.split("/").filter(Boolean);
      const file = parts.pop() || "dashboard.html";
      const parent = parts.pop() || "";
      return parent === "modules" || parent === "certificate" ? `${parent}/${file}` : file;
    },

    isRestrictedPage(){
      const page = document.body.dataset.page;
      return ["dashboard", "module", "assessment", "certificate"].includes(page);
    },

    isGatedHref(href){
      if(!href || href.startsWith("#") || href.startsWith("http") || href.startsWith("mailto:")) return false;
      return [
        "dashboard.html",
        "modules/",
        "certificate/certificate.html"
      ].some((target)=>href.includes(target));
    },

    goToRegistration(next, replace = false){
      const normalizedNext = this.normalizeNextPath(next);
      const target = this.root() + "registration.html" + (normalizedNext ? `?next=${encodeURIComponent(normalizedNext)}` : "");
      if(replace){
        location.replace(target);
        return;
      }
      location.href = target;
    },

    normalizeNextPath(next){
      if(!next) return "";
      let value = String(next).trim();
      if(value.startsWith("http") || value.includes("://")) return "";
      while(value.startsWith("../")){
        value = value.slice(3);
      }
      if(value.startsWith("./")){
        value = value.slice(2);
      }
      return value.replace(/^\/+/, "");
    },

    renderConfigBadges(){
      document.querySelectorAll("[data-final-total]").forEach((node)=>{
        node.textContent = config.TOTAL_FINAL_QUESTIONS || "";
      });
      document.querySelectorAll("[data-pass-mark]").forEach((node)=>{
        node.textContent = `${config.PASS_MARK || 0}%`;
      });
      document.querySelectorAll("[data-organization-name]").forEach((node)=>{
        node.textContent = config.ORGANIZATION_NAME || "";
      });
    },

    renderHome(){
      const grid = document.getElementById("moduleGrid");
      if(!grid || !this.modules.length) return;
      const state = storage.load();
      const registered = storage.isRegistered();

      grid.innerHTML = this.modules.map((module)=>{
        const completed = state.completedModules.includes(module.id);
        const unlocked = registered && state.unlockedModules.includes(module.id);
        const status = !registered ? "Daftar dahulu" : completed ? "Selesai" : unlocked ? "Terbuka" : "Terkunci";
        const statusClass = completed ? "status-complete" : unlocked ? "status-progress" : "status-lock";
        const href = !registered ? "registration.html" : unlocked ? `modules/module${module.id}.html` : "#";

        return `
          <article class="module-card ${completed ? "completed" : ""} ${unlocked ? "" : "locked"}">
            <div class="module-header">
              <span class="module-badge">${this.escape(module.duration)}</span>
              <h3 class="module-title">Modul ${module.id}</h3>
              <p class="module-subtitle">${this.escape(module.shortTitle)}</p>
            </div>
            <div class="module-body">
              <p class="module-description">${this.escape(module.summary)}</p>
              <div class="module-meta">
                <div><span>XP</span><strong>${module.xp}</strong></div>
                <div><span>Lencana</span><strong>${this.escape(module.badge)}</strong></div>
              </div>
              <div class="module-footer">
                <a href="${href}" class="btn ${unlocked ? "btn-primary" : "btn-outline"}" ${unlocked || !registered ? "" : "aria-disabled='true'"}>${!registered ? "Daftar Peserta" : unlocked ? "Buka Modul" : "Selesaikan modul sebelum ini"}</a>
                <span class="${statusClass}">${status}</span>
              </div>
            </div>
          </article>
        `;
      }).join("");

      const primaryStart = document.querySelector("[data-primary-start]");
      if(primaryStart){
        primaryStart.href = registered ? "dashboard.html" : "registration.html";
        primaryStart.textContent = registered ? "Sambung Pembelajaran" : "Daftar Peserta";
      }
    },

    renderDashboard(){
      const page = document.querySelector("[data-page='dashboard']");
      if(!page) return;

      const summary = storage.summary();
      const user = summary.state.user;
      this.setText("dashboardWelcomeName", user.name || "Peserta SPK");
      this.setText("dashboardPosition", user.position || "-");
      this.setText("dashboardUnit", user.unit || user.department || "-");
      this.setText("dashboardEmail", user.email || "-");
      this.setText("dashboardProgress", `${summary.progress}%`);
      this.setText("dashboardXP", summary.xp);
      this.setText("dashboardBadge", summary.badges);
      this.setText("dashboardLevel", summary.level);
      this.setText("moduleCompleteText", summary.completed);
      this.setText(
        "certificateStatus",
        summary.certificateEligible
          ? summary.state.certificate.certificateId || "Layak"
          : "Belum Layak"
      );

      const continueLink = document.getElementById("continueLearning");
      if(continueLink){
        continueLink.href = this.nextLearningHref(summary.state);
      }

      const moduleList = document.getElementById("dashboardModules");
      if(moduleList){
        moduleList.innerHTML = this.modules.map((module)=>{
          const done = summary.state.completedModules.includes(module.id);
          const open = summary.state.unlockedModules.includes(module.id);
          return `
            <a href="${open ? `modules/module${module.id}.html` : "#"}" class="dashboard-module-row ${done ? "done" : ""} ${open ? "" : "muted-row"}">
              <span>Modul ${module.id}</span>
              <strong>${this.escape(module.shortTitle)}</strong>
              <em>${done ? "Selesai" : open ? "Terbuka" : "Terkunci"}</em>
            </a>
          `;
        }).join("");
      }

      const activity = document.getElementById("activityRows");
      if(activity){
        const rows = summary.state.activity.length ? summary.state.activity : [{ text: "Belum mempunyai aktiviti.", date: null }];
        activity.innerHTML = rows.map((item)=>`
          <tr>
            <td>${item.date ? this.formatDate(item.date) : "-"}</td>
            <td>${this.escape(item.text)}</td>
            <td>${item.date ? "Direkod" : "Menunggu"}</td>
          </tr>
        `).join("");
      }
    },

    renderModulePage(){
      const page = document.querySelector("[data-page='module']");
      if(!page || !this.modules.length) return;

      const id = Number(page.dataset.moduleId);
      const module = this.modules.find((item)=>item.id === id);
      if(!module) return;
      if(!storage.isModuleUnlocked(id)){
        ui?.error?.("Modul ini belum dibuka. Lengkapkan modul sebelumnya dahulu.");
        window.setTimeout(()=>location.href = "../dashboard.html", 600);
        return;
      }

      document.title = `Modul ${id} - ${module.shortTitle} | SPK KV MIRI 2026`;
      this.setText("moduleNumber", `Modul ${module.id}`);
      this.setText("moduleTitle", module.title);
      this.setText("moduleSubtitle", module.subtitle);
      this.setText("moduleSummary", module.summary);
      this.setText("moduleDuration", module.duration);
      this.setText("moduleXP", module.xp);
      this.setText("moduleBadge", module.badge);

      const objectives = document.getElementById("moduleObjectives");
      if(objectives){
        objectives.innerHTML = module.objectives.map((item)=>`<li>${this.escape(item)}</li>`).join("");
      }

      const sections = document.getElementById("moduleSections");
      if(sections){
        sections.innerHTML = module.sections.map((section, index)=>`
          <article class="lesson-card">
            <span class="lesson-number">${String(index + 1).padStart(2, "0")}</span>
            <h3>${this.escape(section.heading)}</h3>
            <p>${this.escape(section.body)}</p>
          </article>
        `).join("");
      }

      const activities = document.getElementById("moduleActivities");
      if(activities){
        activities.innerHTML = module.activities.map((activity)=>this.renderActivity(activity)).join("");
      }

      const completeButton = document.getElementById("completeModule");
      if(completeButton){
        const isDone = storage.isModuleCompleted(id);
        completeButton.textContent = isDone ? "Modul Selesai" : "Tandakan Modul Selesai";
        completeButton.disabled = isDone;
        completeButton.addEventListener("click", ()=>{
          storage.completeModule(id, module.xp, module.badge);
          completeButton.textContent = "Modul Selesai";
          completeButton.disabled = true;
          this.setText("moduleStatus", "Modul ini telah direkod sebagai selesai.");
        });
      }

      const next = document.getElementById("nextModuleLink");
      if(next){
        if(id < storage.totalModules){
          next.href = `module${id + 1}.html`;
          next.textContent = `Modul ${id + 1}`;
        }else{
          next.href = "final-assessment.html";
          next.textContent = "Penilaian Akhir";
        }
      }
    },

    nextLearningHref(state){
      const nextModule = this.modules.find((module)=>state.unlockedModules.includes(module.id) && !state.completedModules.includes(module.id));
      if(nextModule){
        return `modules/module${nextModule.id}.html`;
      }
      return "modules/final-assessment.html";
    },

    renderActivity(activity){
      if(activity.type === "checklist"){
        return `
          <article class="activity-card">
            <h3>${this.escape(activity.prompt)}</h3>
            ${activity.items.map((item)=>`
              <label class="check-row">
                <input type="checkbox">
                <span>${this.escape(item)}</span>
              </label>
            `).join("")}
          </article>
        `;
      }

      if(activity.type === "matching"){
        return `
          <article class="activity-card">
            <h3>${this.escape(activity.prompt)}</h3>
            <div class="matching-list">
              ${activity.pairs.map((pair)=>`
                <div><strong>${this.escape(pair[0])}</strong><span>${this.escape(pair[1])}</span></div>
              `).join("")}
            </div>
          </article>
        `;
      }

      return `
        <article class="activity-card">
          <h3>${this.escape(activity.prompt)}</h3>
          <button class="btn btn-outline" data-reveal type="button">Lihat Jawapan</button>
          <div class="reveal-content">${this.escape(activity.answer)}</div>
        </article>
      `;
    },

    renderProgressBadges(){
      const summary = storage.summary();
      document.querySelectorAll("[data-progress-percent]").forEach((node)=>{
        node.textContent = `${summary.progress}%`;
      });
      document.querySelectorAll("[data-progress-fill]").forEach((node)=>{
        node.style.width = `${summary.progress}%`;
      });
      document.querySelectorAll("[data-xp]").forEach((node)=>{
        node.textContent = summary.xp;
      });
      document.querySelectorAll("[data-level]").forEach((node)=>{
        node.textContent = summary.level;
      });
    },

    setText(id, value){
      const node = document.getElementById(id);
      if(node) node.textContent = value;
    },

    formatDate(value){
      return new Date(value).toLocaleDateString("ms-MY", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      });
    },

    escape(value){
      const node = document.createElement("span");
      node.textContent = value == null ? "" : String(value);
      return node.innerHTML;
    }
  };

  SPK.App = App;

  document.addEventListener("DOMContentLoaded", ()=>{
    App.init();
  });
})();
