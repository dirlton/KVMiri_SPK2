"use strict";

(function(){
  const SPK = window.SPK || (window.SPK = {});

  const UI = {
    init(){
      this.ensureLoadingScreen();
      window.addEventListener("load", ()=>this.hideLoadingScreen());
      window.addEventListener("spk-app-ready", ()=>this.hideLoadingScreen());
    },

    ensureLoadingScreen(){
      if(document.querySelector("[data-spk-loading]")) return;
      const screen = document.createElement("div");
      screen.className = "spk-loading-screen";
      screen.dataset.spkLoading = "true";
      screen.innerHTML = `
        <div class="spk-loading-card" role="status" aria-live="polite">
          <span class="spinner" aria-hidden="true"></span>
          <strong>Memuatkan LMS SPK</strong>
          <small>Sila tunggu sebentar.</small>
        </div>
      `;
      document.body.appendChild(screen);
    },

    hideLoadingScreen(){
      const screen = document.querySelector("[data-spk-loading]");
      if(!screen) return;
      screen.classList.add("is-hidden");
      window.setTimeout(()=>screen.remove(), 350);
    },

    toast(message, type = "info", options = {}){
      const host = this.toastHost();
      const item = document.createElement("div");
      item.className = `spk-toast ${type}`;
      item.setAttribute("role", type === "error" ? "alert" : "status");
      item.innerHTML = `
        <span class="toast-dot" aria-hidden="true"></span>
        <span>${this.escape(message)}</span>
      `;
      host.appendChild(item);
      window.setTimeout(()=>item.classList.add("show"), 20);
      window.setTimeout(()=>{
        item.classList.remove("show");
        window.setTimeout(()=>item.remove(), 250);
      }, options.duration || 4200);
      return item;
    },

    success(message){
      return this.toast(message, "success");
    },

    error(message){
      return this.toast(message, "error", { duration: 6200 });
    },

    info(message){
      return this.toast(message, "info");
    },

    toastHost(){
      let host = document.querySelector("[data-spk-toast-host]");
      if(host) return host;
      host = document.createElement("div");
      host.className = "spk-toast-host";
      host.dataset.spkToastHost = "true";
      document.body.appendChild(host);
      return host;
    },

    async confirm(options = {}){
      const title = options.title || "Sahkan tindakan";
      const message = options.message || "Teruskan?";
      const confirmText = options.confirmText || "Ya";
      const cancelText = options.cancelText || "Batal";

      return new Promise((resolve)=>{
        const overlay = document.createElement("div");
        overlay.className = "spk-dialog-overlay";
        overlay.innerHTML = `
          <section class="spk-dialog" role="dialog" aria-modal="true" aria-labelledby="spkDialogTitle">
            <h2 id="spkDialogTitle">${this.escape(title)}</h2>
            <p>${this.escape(message)}</p>
            <div class="form-actions">
              <button class="btn btn-outline" type="button" data-dialog-cancel>${this.escape(cancelText)}</button>
              <button class="btn btn-primary" type="button" data-dialog-confirm>${this.escape(confirmText)}</button>
            </div>
          </section>
        `;
        document.body.appendChild(overlay);
        const close = (value)=>{
          overlay.classList.remove("show");
          window.setTimeout(()=>overlay.remove(), 180);
          resolve(value);
        };
        overlay.querySelector("[data-dialog-cancel]").addEventListener("click", ()=>close(false));
        overlay.querySelector("[data-dialog-confirm]").addEventListener("click", ()=>close(true));
        overlay.addEventListener("click", (event)=>{
          if(event.target === overlay) close(false);
        });
        window.setTimeout(()=>overlay.classList.add("show"), 20);
        overlay.querySelector("[data-dialog-confirm]").focus();
      });
    },

    setBusy(button, busy, busyText){
      if(!button) return;
      if(busy){
        button.dataset.originalText = button.textContent;
        button.disabled = true;
        button.classList.add("is-busy");
        button.textContent = busyText || "Memproses...";
        return;
      }
      button.disabled = false;
      button.classList.remove("is-busy");
      if(button.dataset.originalText){
        button.textContent = button.dataset.originalText;
        delete button.dataset.originalText;
      }
    },

    skeletonRows(count = 4){
      return Array.from({ length: count }, ()=>`
        <div class="skeleton-row" aria-hidden="true">
          <span></span><span></span><span></span>
        </div>
      `).join("");
    },

    escape(value){
      const node = document.createElement("span");
      node.textContent = value == null ? "" : String(value);
      return node.innerHTML;
    }
  };

  SPK.UI = UI;

  document.addEventListener("DOMContentLoaded", ()=>{
    UI.init();
  });
})();
