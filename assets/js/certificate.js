"use strict";

(function(){
  const SPK = window.SPK || {};
  const storage = SPK.Storage;
  const api = SPK.Api;
  const ui = SPK.UI;
  const config = SPK.Config || {};

  const Certificate = {
    init(){
      const page = document.querySelector("[data-page='certificate']");
      if(!page) return;

      this.bind();
      this.render();
    },

    bind(){
      document.getElementById("generateCertificate")?.addEventListener("click", async ()=>{
        await this.generate();
      });

      document.getElementById("printCertificate")?.addEventListener("click", ()=>{
        window.print();
      });
    },

    async generate(){
      const state = storage.load();
      if(!state.certificate.eligible){
        ui?.error?.("Sijil boleh dijana selepas lulus Penilaian Akhir.");
        this.text("certificateGate", "Sijil boleh dijana selepas lulus Penilaian Akhir.");
        return;
      }

      const button = document.getElementById("generateCertificate");
      ui?.setBusy?.(button, true, "Menjana...");

      if(state.certificate.certificateId){
        storage.generateCertificate({
          certificateId: state.certificate.certificateId
        });
        this.render();
        ui?.success?.("Sijil sedia untuk dicetak.");
        ui?.setBusy?.(button, false);
        return;
      }

      try{
        const response = await api.generateCertificate(this.payload(state));
        if(response.ok && response.certificateId){
          storage.generateCertificate({
            certificateId: response.certificateId
          });
          this.render();
          ui?.success?.("Certificate ID berjaya dijana.");
          return;
        }

        ui?.error?.(response.message || "Certificate ID belum berjaya dijana.");
        this.text("certificateGate", response.message || "Certificate ID belum berjaya dijana. Cuba lagi.");
      }catch(error){
        ui?.error?.("Sambungan gagal. Cuba jana sijil semula.");
        this.text("certificateGate", "Sambungan gagal. Cuba jana sijil semula.");
      }finally{
        ui?.setBusy?.(button, false);
      }
    },

    payload(state){
      return {
        name: state.user.name,
        noKp: state.user.noKp,
        email: state.user.email,
        position: state.user.position,
        unit: state.user.unit || state.user.department,
        score: state.finalAssessment.score,
        total: state.finalAssessment.total,
        percent: state.finalAssessment.percent,
        status: state.finalAssessment.status,
        attempt: state.finalAssessment.attempts,
        submissionId: state.finalAssessment.submissionId
      };
    },

    render(){
      const state = storage.load();
      const user = state.user;
      const certificateId = state.certificate.certificateId || state.finalAssessment.certificateId || "";

      this.text("participantName", user.name || "-");
      this.text("participantNoKp", user.noKp || "-");
      this.text("participantEmail", user.email || "-");
      this.text("participantPosition", user.position || "-");
      this.text("participantUnit", user.unit || user.department || "-");
      this.text("participantCertificateId", certificateId || "Menunggu");

      this.text("certName", user.name || "Peserta");
      this.text("certDepartment", user.unit || user.department || config.ORGANIZATION_NAME || "Kolej Vokasional Miri");
      this.text("certDate", this.formatDate(state.certificate.generatedDate || new Date().toISOString()));
      this.text("certScore", `${state.finalAssessment.percent || 0}%`);
      this.text("certId", certificateId || "Menunggu Certificate ID");

      const status = document.getElementById("certificateGate");
      if(status){
        status.textContent = state.certificate.eligible
          ? certificateId
            ? `Layak menjana sijil. Certificate ID: ${certificateId}`
            : "Layak menjana sijil. Jana Certificate ID sebelum mencetak."
          : "Belum layak. Lengkapkan modul dan lulus Penilaian Akhir dahulu.";
        status.className = state.certificate.eligible ? "gate open" : "gate";
      }

      const generate = document.getElementById("generateCertificate");
      if(generate){
        generate.disabled = !state.certificate.eligible;
        generate.textContent = certificateId ? "Sijil Sedia" : "Jana Sijil";
      }

      const print = document.getElementById("printCertificate");
      if(print){
        print.disabled = !certificateId;
      }
    },

    text(id, value){
      const node = document.getElementById(id);
      if(node) node.textContent = value;
    },

    formatDate(value){
      return new Date(value).toLocaleDateString("ms-MY", {
        day: "2-digit",
        month: "long",
        year: "numeric"
      });
    }
  };

  SPK.Certificate = Certificate;

  document.addEventListener("DOMContentLoaded", ()=>{
    Certificate.init();
  });
})();
