"use strict";

(function(){
  const SPK = window.SPK || (window.SPK = {});
  const config = SPK.Config || {};

  const Api = {
    async call(action, payload = {}){
      if(!config.ENABLE_GOOGLE_APPS_SCRIPT){
        return {
          ok: false,
          offline: true,
          message: "Integrasi Google Apps Script tidak diaktifkan."
        };
      }

      if(!config.API_URL){
        return {
          ok: false,
          message: "URL API tidak ditemui dalam konfigurasi."
        };
      }

      const request = Object.assign({}, payload, {
        appVersion: config.APP_VERSION
      });

      if(config.API_TRANSPORT === "fetch"){
        return this.fetchCall(action, request);
      }

      return this.jsonpCall(action, request);
    },

    async fetchCall(action, payload){
      const body = new URLSearchParams();
      body.set("action", action);
      body.set("payload", JSON.stringify(payload));

      const controller = new AbortController();
      const timeout = Number(config.API_TIMEOUT_MS);
      const timer = window.setTimeout(()=>controller.abort(), timeout);

      try{
        const response = await fetch(config.API_URL, {
          method: "POST",
          body,
          signal: controller.signal
        });
        const data = await response.json();
        return this.normalize(data);
      }catch(error){
        return {
          ok: false,
          message: "Sambungan ke Google Apps Script gagal.",
          error: error.message
        };
      }finally{
        window.clearTimeout(timer);
      }
    },

    jsonpCall(action, payload){
      return new Promise((resolve)=>{
        const callbackName = `spkApi_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        const script = document.createElement("script");
        const timer = window.setTimeout(()=>{
          cleanup();
          resolve({
            ok: false,
            message: "Google Apps Script tidak memberi respons dalam masa yang ditetapkan."
          });
        }, Number(config.API_TIMEOUT_MS));

        const cleanup = ()=>{
          window.clearTimeout(timer);
          delete window[callbackName];
          script.remove();
        };

        window[callbackName] = (data)=>{
          cleanup();
          resolve(this.normalize(data));
        };

        script.onerror = ()=>{
          cleanup();
          resolve({
            ok: false,
            message: "Permintaan ke Google Apps Script gagal dimuatkan."
          });
        };

        script.src = this.buildUrl(action, payload, callbackName);
        document.head.appendChild(script);
      });
    },

    buildUrl(action, payload, callbackName){
      const params = new URLSearchParams();
      params.set("action", action);
      params.set("payload", JSON.stringify(payload));
      params.set("callback", callbackName);
      params.set("_", String(Date.now()));
      const separator = config.API_URL.includes("?") ? "&" : "?";
      return `${config.API_URL}${separator}${params.toString()}`;
    },

    normalize(data){
      if(!data || typeof data !== "object"){
        return {
          ok: false,
          message: "Respons API tidak sah."
        };
      }
      return data;
    },

    saveAttendance(participant){
      return this.call("saveAttendance", {
        participant
      });
    },

    saveScore(score){
      return this.call("saveScore", {
        score
      });
    },

    generateCertificate(payload){
      return this.call("generateCertificate", payload);
    },

    verifyCertificate(certificateId){
      return this.call("verifyCertificate", {
        certificateId
      });
    },

    getStatistics(){
      return this.call("getStatistics", {});
    },

    getParticipant(noKp){
      return this.call("getParticipant", {
        noKp
      });
    }
  };

  SPK.Api = Api;
})();
