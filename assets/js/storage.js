"use strict";

(function(){
  const SPK = window.SPK || (window.SPK = {});
  const config = SPK.Config || {};
  const key = config.STORAGE_KEY;

  const defaults = {
    user: {
      name: "",
      noKp: "",
      email: "",
      position: "",
      unit: "",
      department: "",
      registered: false,
      registeredAt: null,
      attendanceSubmitted: false,
      attendanceId: "",
      attendanceSyncedAt: null
    },
    completedModules: [],
    unlockedModules: [1],
    xp: 0,
    badges: [],
    quizzes: {},
    finalAssessment: {
      attempted: false,
      attempts: 0,
      passed: false,
      score: 0,
      total: 0,
      percent: 0,
      status: "Belum Menjawab",
      durationSeconds: 0,
      date: null,
      submitted: false,
      submittedAt: null,
      submissionId: "",
      certificateId: ""
    },
    certificate: {
      eligible: false,
      generated: false,
      generatedDate: null,
      certificateId: ""
    },
    pendingSync: {
      attendance: null,
      score: null
    },
    activity: []
  };

  function clone(value){
    return JSON.parse(JSON.stringify(value));
  }

  function uniqueNumbers(items){
    return Array.from(new Set((items || []).map(Number))).filter(Number.isFinite);
  }

  function uniqueStrings(items){
    return Array.from(new Set((items || []).filter(Boolean)));
  }

  function cleanText(value){
    return String(value || "").trim();
  }

  function now(){
    return new Date().toISOString();
  }

  const Storage = {
    get totalModules(){
      return Number(config.TOTAL_MODULES || 0);
    },

    get passingScore(){
      return Number(config.PASS_MARK || 0);
    },

    load(){
      try{
        const stored = JSON.parse(localStorage.getItem(key));
        const state = Object.assign(clone(defaults), stored || {});
        state.user = Object.assign(clone(defaults.user), stored?.user || {});
        state.finalAssessment = Object.assign(
          clone(defaults.finalAssessment),
          stored?.finalAssessment || {}
        );
        state.certificate = Object.assign(
          clone(defaults.certificate),
          stored?.certificate || {}
        );
        state.pendingSync = Object.assign(
          clone(defaults.pendingSync),
          stored?.pendingSync || {}
        );

        if(!state.user.unit && state.user.department){
          state.user.unit = state.user.department;
        }
        if(!state.user.department && state.user.unit){
          state.user.department = state.user.unit;
        }
        state.user.registered = Boolean(state.user.registered && state.user.noKp);

        state.completedModules = uniqueNumbers(state.completedModules);
        state.unlockedModules = uniqueNumbers(state.unlockedModules);
        if(!state.unlockedModules.includes(1)){
          state.unlockedModules.push(1);
        }
        state.badges = uniqueStrings(state.badges);
        state.activity = Array.isArray(state.activity) ? state.activity : [];
        state.quizzes = state.quizzes || {};
        state.finalAssessment.attempts = Number(state.finalAssessment.attempts || 0);
        state.finalAssessment.status = state.finalAssessment.status || "Belum Menjawab";
        state.certificate.certificateId = state.certificate.certificateId || state.finalAssessment.certificateId || "";
        state.certificate.eligible = Boolean(state.certificate.eligible || state.finalAssessment.passed);
        return state;
      }catch(error){
        return clone(defaults);
      }
    },

    save(state){
      localStorage.setItem(key, JSON.stringify(state));
      window.dispatchEvent(new CustomEvent("spk-state-change", { detail: state }));
      return state;
    },

    reset(){
      localStorage.removeItem(key);
      if(config.REGISTRATION_DRAFT_KEY){
        localStorage.removeItem(config.REGISTRATION_DRAFT_KEY);
      }
      return this.save(clone(defaults));
    },

    isRegistered(){
      return this.load().user.registered;
    },

    participant(){
      const user = this.load().user;
      return {
        name: user.name,
        noKp: user.noKp,
        email: user.email,
        position: user.position,
        unit: user.unit
      };
    },

    registerParticipant(participant, attendanceResult = {}){
      const state = this.load();
      state.user = Object.assign({}, state.user, {
        name: cleanText(participant.name),
        noKp: cleanText(participant.noKp),
        email: cleanText(participant.email),
        position: cleanText(participant.position),
        unit: cleanText(participant.unit),
        department: cleanText(participant.unit),
        registered: true,
        registeredAt: state.user.registeredAt || now(),
        attendanceSubmitted: true,
        attendanceId: attendanceResult.attendanceId || state.user.attendanceId || "",
        attendanceSyncedAt: now()
      });
      state.pendingSync.attendance = null;
      this.addActivity(state, "Pendaftaran peserta direkodkan.");
      return this.save(state);
    },

    savePendingAttendance(participant, errorMessage){
      const state = this.load();
      state.pendingSync.attendance = {
        participant,
        errorMessage,
        savedAt: now()
      };
      return this.save(state);
    },

    updateUser(user){
      const state = this.load();
      const next = Object.assign({}, state.user, user);
      if(next.unit && !next.department){
        next.department = next.unit;
      }
      state.user = next;
      this.addActivity(state, "Profil peserta dikemaskini.");
      return this.save(state);
    },

    isModuleCompleted(moduleId){
      return this.load().completedModules.includes(Number(moduleId));
    },

    isModuleUnlocked(moduleId){
      return this.load().unlockedModules.includes(Number(moduleId));
    },

    completeModule(moduleId, xp, badge){
      const state = this.load();
      const id = Number(moduleId);
      const firstCompletion = !state.completedModules.includes(id);

      if(firstCompletion){
        state.completedModules.push(id);
        state.completedModules.sort((a,b)=>a-b);
        state.xp += Number(xp || 0);
        if(badge && !state.badges.includes(badge)){
          state.badges.push(badge);
        }
        this.addActivity(state, `Modul ${id} selesai.`);
      }

      const next = id + 1;
      if(next <= this.totalModules && !state.unlockedModules.includes(next)){
        state.unlockedModules.push(next);
        state.unlockedModules.sort((a,b)=>a-b);
      }

      return this.save(state);
    },

    canAttemptFinal(){
      const state = this.load();
      return state.finalAssessment.attempts < Number(config.MAX_ATTEMPT || 0);
    },

    nextAttemptNumber(){
      return this.load().finalAssessment.attempts + 1;
    },

    saveQuizResult(quizId, result){
      const state = this.load();
      const date = now();
      state.quizzes[quizId] = Object.assign({}, result, {
        date
      });

      if(quizId === "final"){
        const attempts = state.finalAssessment.attempts + 1;
        const passed = result.percent >= this.passingScore;
        const submissionId = result.submissionId || this.createSubmissionId(state.user.noKp, attempts);
        state.finalAssessment = {
          attempted: true,
          attempts,
          passed,
          score: result.score,
          total: result.total,
          percent: result.percent,
          status: passed ? "LULUS" : "GAGAL",
          durationSeconds: Number(result.durationSeconds || 0),
          date,
          submitted: false,
          submittedAt: null,
          submissionId,
          certificateId: ""
        };

        if(passed){
          state.certificate.eligible = true;
          this.addActivity(state, "Penilaian akhir lulus. Menunggu Certificate ID.");
        }else{
          this.addActivity(state, "Penilaian akhir belum mencapai markah lulus.");
        }
      }else{
        this.addActivity(state, `${result.title || "Kuiz"} selesai: ${result.percent}%.`);
      }

      return this.save(state);
    },

    updateFinalSubmission(meta = {}){
      const state = this.load();
      state.finalAssessment.submitted = Boolean(meta.submitted);
      state.finalAssessment.submittedAt = meta.submittedAt || now();
      state.finalAssessment.certificateId = meta.certificateId || state.finalAssessment.certificateId || "";
      state.pendingSync.score = meta.submitted ? null : {
        errorMessage: meta.errorMessage || "Penghantaran markah belum berjaya.",
        savedAt: now()
      };

      if(state.finalAssessment.certificateId){
        state.certificate.certificateId = state.finalAssessment.certificateId;
        state.certificate.eligible = true;
      }

      this.addActivity(
        state,
        meta.submitted ? "Markah penilaian akhir dihantar ke Google Sheet." : "Markah penilaian akhir belum berjaya dihantar."
      );
      return this.save(state);
    },

    generateCertificate(meta = {}){
      const state = this.load();
      if(!state.certificate.eligible){
        return this.save(state);
      }
      state.certificate.generated = true;
      state.certificate.generatedDate = now();
      state.certificate.certificateId = meta.certificateId || state.certificate.certificateId || "";
      state.finalAssessment.certificateId = state.certificate.certificateId;
      this.addActivity(state, "Sijil digital dijana.");
      return this.save(state);
    },

    moduleProgress(){
      const total = this.totalModules;
      if(!total) return 0;
      const state = this.load();
      return Math.round((state.completedModules.length / total) * 100);
    },

    level(){
      const state = this.load();
      return Math.max(1, Math.floor(state.xp / 200) + 1);
    },

    summary(){
      const state = this.load();
      return {
        state,
        progress: this.moduleProgress(),
        level: this.level(),
        completed: state.completedModules.length,
        remaining: Math.max(0, this.totalModules - state.completedModules.length),
        xp: state.xp,
        badges: state.badges.length,
        certificateEligible: state.certificate.eligible,
        participantName: state.user.name || "Peserta",
        participantPosition: state.user.position || "-",
        participantUnit: state.user.unit || state.user.department || "-"
      };
    },

    createSubmissionId(noKp, attempt){
      const identity = cleanText(noKp).replace(/\D/g, "") || "anon";
      return `${identity}-${attempt}-${Date.now()}`;
    },

    addActivity(state, text){
      state.activity.unshift({
        text,
        date: now()
      });
      state.activity = state.activity.slice(0, 8);
    }
  };

  SPK.Storage = Storage;
})();
