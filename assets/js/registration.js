"use strict";

(function(){
  const SPK = window.SPK || {};
  const storage = SPK.Storage;
  const api = SPK.Api;
  const ui = SPK.UI;
  const config = SPK.Config || {};

  const Registration = {
    init(){
      const form = document.getElementById("registrationForm");
      if(!form) return;

      this.form = form;
      this.alert = document.getElementById("registrationAlert");
      this.restoreDraft();
      this.bind();

      if(storage.isRegistered()){
        this.showAlert("Profil peserta telah direkodkan. Membuka dashboard...", "success");
        window.setTimeout(()=>this.redirectNext(), 700);
      }
    },

    bind(){
      this.form.addEventListener("input", ()=>this.saveDraft());
      this.form.addEventListener("submit", (event)=>{
        event.preventDefault();
        this.submit();
      });
    },

    async submit(){
      const participant = this.readForm();
      const errors = this.validate(participant);
      this.renderErrors(errors);

      if(Object.keys(errors).length){
        this.showAlert("Sila lengkapkan semua maklumat dengan format yang betul.", "error");
        ui?.error?.("Sila semak maklumat pendaftaran.");
        return;
      }

      const button = document.getElementById("startLearning");
      ui?.setBusy?.(button, true, "Menghantar...");

      try{
        const response = await api.saveAttendance(participant);
        if(response.ok){
          storage.registerParticipant(participant, response);
          this.clearDraft();
          this.showAlert("Pendaftaran berjaya. Rekod kehadiran telah dihantar.", "success");
          ui?.success?.("Pendaftaran berjaya direkodkan.");
          window.setTimeout(()=>this.redirectNext(), 900);
          return;
        }

        storage.savePendingAttendance(participant, response.message);
        this.showAlert(response.message || "Pendaftaran belum berjaya dihantar. Cuba lagi.", "error");
        ui?.error?.(response.message || "Pendaftaran belum berjaya dihantar.");
      }catch(error){
        storage.savePendingAttendance(participant, error.message);
        this.showAlert("Sambungan gagal. Data borang dikekalkan untuk percubaan semula.", "error");
        ui?.error?.("Sambungan gagal. Cuba lagi sebentar.");
      }finally{
        ui?.setBusy?.(button, false);
      }
    },

    readForm(){
      const data = new FormData(this.form);
      return {
        name: String(data.get("name") || "").trim(),
        noKp: String(data.get("noKp") || "").replace(/\D/g, ""),
        email: String(data.get("email") || "").trim(),
        position: String(data.get("position") || "").trim(),
        unit: String(data.get("unit") || "").trim(),
        confirmation: data.get("confirmation") === "on"
      };
    },

    validate(participant){
      const errors = {};
      if(participant.name.length < 3){
        errors.name = "Nama penuh wajib diisi.";
      }
      if(!/^\d{12}$/.test(participant.noKp)){
        errors.noKp = "No Kad Pengenalan mestilah 12 digit tanpa simbol.";
      }
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(participant.email)){
        errors.email = "Email tidak sah.";
      }
      if(participant.position.length < 2){
        errors.position = "Jawatan wajib diisi.";
      }
      if(participant.unit.length < 2){
        errors.unit = "Unit atau bahagian wajib diisi.";
      }
      if(!participant.confirmation){
        errors.confirmation = "Pengesahan maklumat diperlukan.";
      }
      return errors;
    },

    renderErrors(errors){
      this.form.querySelectorAll("[data-error-for]").forEach((node)=>{
        const field = node.dataset.errorFor;
        node.textContent = errors[field] || "";
      });
      this.form.querySelectorAll("input").forEach((input)=>{
        input.classList.toggle("has-error", Boolean(errors[input.name]));
      });
    },

    showAlert(message, type){
      if(!this.alert) return;
      this.alert.textContent = message;
      this.alert.className = `form-alert show ${type}`;
    },

    saveDraft(){
      if(!config.REGISTRATION_DRAFT_KEY) return;
      const participant = this.readForm();
      localStorage.setItem(config.REGISTRATION_DRAFT_KEY, JSON.stringify(participant));
    },

    restoreDraft(){
      if(!config.REGISTRATION_DRAFT_KEY) return;
      try{
        const draft = JSON.parse(localStorage.getItem(config.REGISTRATION_DRAFT_KEY));
        if(!draft) return;
        this.value("fullName", draft.name);
        this.value("noKp", draft.noKp);
        this.value("email", draft.email);
        this.value("position", draft.position);
        this.value("unit", draft.unit);
        const confirmation = document.getElementById("confirmation");
        if(confirmation) confirmation.checked = Boolean(draft.confirmation);
      }catch(error){
        localStorage.removeItem(config.REGISTRATION_DRAFT_KEY);
      }
    },

    clearDraft(){
      if(config.REGISTRATION_DRAFT_KEY){
        localStorage.removeItem(config.REGISTRATION_DRAFT_KEY);
      }
    },

    value(id, value){
      const node = document.getElementById(id);
      if(node) node.value = value || "";
    },

    redirectNext(){
      const params = new URLSearchParams(location.search);
      const next = params.get("next") || "dashboard.html";
      if(next.startsWith("http") || next.includes("://")){
        location.href = "dashboard.html";
        return;
      }
      location.href = next;
    }
  };

  SPK.Registration = Registration;

  document.addEventListener("DOMContentLoaded", ()=>{
    Registration.init();
  });
})();
