"use strict";

(function(){
  const SPK = window.SPK || {};
  const api = SPK.Api;
  const ui = SPK.UI;
  const config = SPK.Config || {};

  const AdminDashboard = {
    init(){
      const page = document.querySelector("[data-page='admin']");
      if(!page) return;

      document.getElementById("refreshAdminDashboard")?.addEventListener("click", ()=>this.load());
      document.getElementById("adminSearchForm")?.addEventListener("submit", (event)=>{
        event.preventDefault();
        this.search();
      });
      this.load();
    },

    async load(){
      const button = document.getElementById("refreshAdminDashboard");
      ui?.setBusy?.(button, true, "Memuatkan...");
      this.renderSkeleton();

      try{
        const response = await api.getStatistics();
        if(response.ok){
          this.render(response.statistics || {});
          ui?.success?.("Dashboard pentadbir dikemaskini.");
          return;
        }
        this.renderError(response.message || "Data pentadbir belum berjaya dimuatkan.");
      }catch(error){
        this.renderError("Sambungan ke Google Apps Script gagal.");
      }finally{
        ui?.setBusy?.(button, false);
      }
    },

    renderSkeleton(){
      const rows = document.getElementById("adminUserRows");
      if(rows){
        rows.innerHTML = `<tr><td colspan="6">${SPK.UI?.skeletonRows?.(3) || "Memuatkan data..."}</td></tr>`;
      }
      const chart = document.getElementById("adminPerformanceChart");
      if(chart){
        chart.innerHTML = SPK.UI?.skeletonRows?.(4) || "";
      }
    },

    render(statistics){
      this.text("adminTotalUsers", statistics.totalUsers || 0);
      this.text("adminTotalAttendance", statistics.totalAttendance || 0);
      this.text("adminAverageScore", `${statistics.averageScore || 0}%`);
      this.text("adminPassed", statistics.passed || 0);
      this.text("adminFailed", statistics.failed || 0);
      this.renderChart(statistics.performance || []);
      this.renderUsers(statistics.users || []);
    },

    renderChart(performance){
      const chart = document.getElementById("adminPerformanceChart");
      if(!chart) return;
      const fallbackBuckets = (config.PERFORMANCE_BUCKETS || []).map((bucket)=>({
        label: bucket.label,
        value: 0
      }));
      const items = performance.length ? performance : fallbackBuckets;
      const max = Math.max(1, ...items.map((item)=>Number(item.value || 0)));
      chart.innerHTML = items.map((item)=>{
        const height = Math.max(8, Math.round((Number(item.value || 0) / max) * 100));
        return `
          <div class="chart-bar">
            <span style="height:${height}%"></span>
            <strong>${this.escape(item.value || 0)}</strong>
            <small>${this.escape(item.label)}</small>
          </div>
        `;
      }).join("");
    },

    renderUsers(users){
      const rows = document.getElementById("adminUserRows");
      if(!rows) return;
      if(!users.length){
        rows.innerHTML = `<tr><td colspan="6">Tiada rekod pengguna.</td></tr>`;
        return;
      }
      rows.innerHTML = users.map((user)=>`
        <tr>
          <td>${this.escape(user.name || "-")}</td>
          <td>${this.escape(user.noKp || "-")}</td>
          <td>${this.escape(user.unit || "-")}</td>
          <td>${this.escape(user.percent || "-")}</td>
          <td>${this.escape(user.status || "-")}</td>
          <td>${this.escape(user.certificateId || "-")}</td>
        </tr>
      `).join("");
    },

    async search(){
      const noKp = String(new FormData(document.getElementById("adminSearchForm")).get("noKp") || "").replace(/\D/g, "");
      const result = document.getElementById("adminSearchResult");
      if(!/^\d{12}$/.test(noKp)){
        result.innerHTML = `<p class="empty-state">Masukkan No KP 12 digit.</p>`;
        return;
      }

      const button = document.getElementById("adminSearchButton");
      ui?.setBusy?.(button, true, "Mencari...");
      result.innerHTML = SPK.UI?.skeletonRows?.(2) || "Mencari...";

      try{
        const response = await api.getParticipant(noKp);
        if(response.ok && response.found){
          this.renderSearchResult(response.participant || {});
          return;
        }
        result.innerHTML = `<p class="empty-state">Rekod peserta tidak dijumpai.</p>`;
      }catch(error){
        result.innerHTML = `<p class="empty-state">Carian gagal. Cuba lagi sebentar.</p>`;
      }finally{
        ui?.setBusy?.(button, false);
      }
    },

    renderSearchResult(participant){
      const result = document.getElementById("adminSearchResult");
      result.innerHTML = `
        <ul class="summary-list">
          <li><span>Nama</span><strong>${this.escape(participant.name || "-")}</strong></li>
          <li><span>Email</span><strong>${this.escape(participant.email || "-")}</strong></li>
          <li><span>Unit</span><strong>${this.escape(participant.unit || "-")}</strong></li>
          <li><span>Markah</span><strong>${this.escape(participant.percent || "-")}</strong></li>
          <li><span>Status</span><strong>${this.escape(participant.status || "-")}</strong></li>
          <li><span>Certificate ID</span><strong>${this.escape(participant.certificateId || "-")}</strong></li>
        </ul>
      `;
    },

    renderError(message){
      this.text("adminTotalUsers", 0);
      this.text("adminTotalAttendance", 0);
      this.text("adminAverageScore", "0%");
      this.text("adminPassed", 0);
      this.text("adminFailed", 0);
      this.renderChart([]);
      const rows = document.getElementById("adminUserRows");
      if(rows){
        rows.innerHTML = `<tr><td colspan="6">${this.escape(message)}</td></tr>`;
      }
      ui?.error?.(message);
    },

    text(id, value){
      const node = document.getElementById(id);
      if(node) node.textContent = value;
    },

    escape(value){
      const node = document.createElement("span");
      node.textContent = value == null ? "" : String(value);
      return node.innerHTML;
    }
  };

  SPK.AdminDashboard = AdminDashboard;

  document.addEventListener("DOMContentLoaded", ()=>{
    AdminDashboard.init();
  });
})();
