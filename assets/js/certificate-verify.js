"use strict";

(function(){
  const SPK = window.SPK || {};
  const api = SPK.Api;
  const ui = SPK.UI;
  const config = SPK.Config || {};

  const CertificateVerify = {
    init(){
      const form = document.getElementById("verifyCertificateForm");
      if(!form) return;

      this.form = form;
      this.result = document.getElementById("verificationResult");
      form.addEventListener("submit", (event)=>{
        event.preventDefault();
        this.verify();
      });
    },

    async verify(){
      if(config.ENABLE_CERTIFICATE_VERIFICATION === false){
        this.renderError("Semakan sijil tidak diaktifkan.");
        return;
      }

      const certificateId = this.readCertificateId();
      if(!certificateId){
        this.setFieldError("Sila masukkan Certificate ID.");
        return;
      }
      this.setFieldError("");

      const button = document.getElementById("verifyCertificateButton");
      ui?.setBusy?.(button, true, "Menyemak...");
      this.renderLoading();

      try{
        const response = await api.verifyCertificate(certificateId);
        if(response.ok && response.found){
          this.renderFound(response.record);
          ui?.success?.("Sijil dijumpai.");
          return;
        }
        this.renderError("Sijil tidak dijumpai.");
      }catch(error){
        this.renderError("Semakan gagal. Cuba lagi sebentar.");
      }finally{
        ui?.setBusy?.(button, false);
      }
    },

    readCertificateId(){
      return String(new FormData(this.form).get("certificateId") || "").trim().toUpperCase();
    },

    setFieldError(message){
      const node = this.form.querySelector("[data-error-for='certificateId']");
      if(node) node.textContent = message;
    },

    renderLoading(){
      this.result.innerHTML = `
        <h2>Keputusan Semakan</h2>
        <div class="skeleton-row"><span></span><span></span><span></span></div>
        <div class="skeleton-row"><span></span><span></span><span></span></div>
      `;
    },

    renderFound(record = {}){
      this.result.innerHTML = `
        <h2>Sijil Dijumpai</h2>
        <ul class="summary-list">
          <li><span>Nama</span><strong>${this.escape(record.name || "-")}</strong></li>
          <li><span>Tarikh</span><strong>${this.escape(record.date || "-")}</strong></li>
          <li><span>Markah</span><strong>${this.escape(record.percent || record.score || "-")}</strong></li>
          <li><span>Status</span><strong>${this.escape(record.status || "-")}</strong></li>
        </ul>
      `;
    },

    renderError(message){
      this.result.innerHTML = `
        <h2>Keputusan Semakan</h2>
        <p class="empty-state">${this.escape(message)}</p>
      `;
      ui?.error?.(message);
    },

    escape(value){
      const node = document.createElement("span");
      node.textContent = value == null ? "" : String(value);
      return node.innerHTML;
    }
  };

  SPK.CertificateVerify = CertificateVerify;

  document.addEventListener("DOMContentLoaded", ()=>{
    CertificateVerify.init();
  });
})();
