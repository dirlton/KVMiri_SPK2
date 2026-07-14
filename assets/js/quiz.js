"use strict";

(function(){
  const SPK = window.SPK || {};
  const storage = SPK.Storage;
  const api = SPK.Api;
  const ui = SPK.UI;
  const config = SPK.Config || {};

  const Quiz = {
    async init(){
      const shells = document.querySelectorAll("[data-quiz]");
      if(!shells.length) return;

      const data = await this.loadData();
      shells.forEach((shell)=>{
        const quiz = data.quizzes[shell.dataset.quiz];
        if(quiz){
          this.render(shell, quiz, shell.dataset.quiz);
        }
      });
    },

    async loadData(){
      const root = SPK.App ? SPK.App.root() : "";
      const response = await fetch(root + "data/assessments.json");
      if(!response.ok){
        throw new Error("Data kuiz tidak dapat dibaca.");
      }
      return response.json();
    },

    render(shell, quiz, quizId){
      const isFinal = quizId === "final";
      const state = storage.load();

      if(isFinal && state.completedModules.length < storage.totalModules){
        shell.innerHTML = `
          <div class="quiz-result show">
            <div class="result-score">${state.completedModules.length}/${storage.totalModules}</div>
            <p class="result-message">Lengkapkan semua modul sebelum menjawab Penilaian Akhir.</p>
            <div class="result-actions">
              <a class="btn btn-outline" href="../dashboard.html">Kembali ke Dashboard</a>
            </div>
          </div>
        `;
        return;
      }

      if(isFinal && state.finalAssessment.passed){
        shell.innerHTML = `
          <div class="quiz-result show">
            <div class="result-score">${state.finalAssessment.percent}%</div>
            <p class="result-message">Anda telah lulus Penilaian Akhir.</p>
            <p>Certificate ID: <strong>${this.escape(state.certificate.certificateId || state.finalAssessment.certificateId || "Menunggu Certificate ID")}</strong></p>
            <div class="result-actions">
              <a class="btn btn-primary" href="../certificate/certificate.html">Lihat Sijil</a>
              <a class="btn btn-outline" href="../dashboard.html">Kembali ke Dashboard</a>
            </div>
          </div>
        `;
        return;
      }

      if(isFinal && !storage.canAttemptFinal() && !state.finalAssessment.passed){
        shell.innerHTML = `
          <div class="quiz-result show">
            <div class="result-score">0</div>
            <p class="result-message">Had cubaan penilaian akhir telah dicapai.</p>
            <div class="result-actions">
              <a class="btn btn-outline" href="../dashboard.html">Kembali ke Dashboard</a>
            </div>
          </div>
        `;
        return;
      }

      const prepared = this.prepareQuiz(quiz, quizId);
      shell.dataset.quizStartedAt = String(Date.now());
      shell.innerHTML = `
        <div class="quiz-header">
          <span class="eyebrow">${isFinal ? "Final Assessment" : "Kuiz Interaktif"}</span>
          <h2>${this.escape(prepared.title)}</h2>
          <p>${this.escape(prepared.description)}</p>
          ${this.renderQuizInfo(quizId, prepared.questions.length)}
        </div>
        <form class="quiz-form" novalidate>
          ${prepared.questions.map((question, index)=>this.renderQuestion(question, index)).join("")}
          <div class="quiz-actions">
            <button type="submit" class="btn btn-gradient">${isFinal ? "Hantar Penilaian" : "Semak Jawapan"}</button>
            <button type="button" class="btn btn-outline" data-retry-quiz>Reset Pilihan</button>
          </div>
        </form>
        <div class="quiz-result" aria-live="polite"></div>
      `;

      const form = shell.querySelector("form");
      form.addEventListener("submit", async (event)=>{
        event.preventDefault();
        await this.submit(shell, prepared, quizId);
      });

      shell.querySelector("[data-retry-quiz]").addEventListener("click", ()=>{
        form.reset();
        shell.dataset.quizStartedAt = String(Date.now());
        shell.querySelector(".quiz-result").classList.remove("show");
        shell.querySelectorAll(".option").forEach((option)=>{
          option.classList.remove("correct", "incorrect");
        });
      });
    },

    renderQuizInfo(quizId, total){
      if(quizId !== "final") return "";
      return `
        <div class="quiz-info">
          <span class="quiz-pill">Soalan: ${total}</span>
          <span class="quiz-pill">Markah Lulus: ${config.PASS_MARK}%</span>
          <span class="quiz-pill">Cubaan: ${storage.nextAttemptNumber()} / ${config.MAX_ATTEMPT}</span>
        </div>
      `;
    },

    prepareQuiz(quiz, quizId){
      const prepared = JSON.parse(JSON.stringify(quiz));
      if(quizId !== "final"){
        return prepared;
      }

      prepared.questions = this.shuffle(prepared.questions).slice(0, Number(config.TOTAL_FINAL_QUESTIONS || prepared.questions.length));
      prepared.questions = prepared.questions.map((question)=>{
        question.options = this.shuffle(question.options);
        return question;
      });
      return prepared;
    },

    renderQuestion(question, index){
      const inputType = question.type === "multiple" ? "checkbox" : "radio";
      return `
        <fieldset class="question-card" data-question-id="${this.escape(question.id)}">
          <legend>
            <span class="question-number">Soalan ${index + 1}</span>
            <span class="question-title">${this.escape(question.question)}</span>
          </legend>
          <div class="option-list">
            ${question.options.map((option, optionIndex)=>`
              <label class="option">
                <input type="${inputType}" name="${this.escape(question.id)}" value="${this.escape(option)}">
                <span>${String.fromCharCode(65 + optionIndex)}. ${this.escape(option)}</span>
              </label>
            `).join("")}
          </div>
        </fieldset>
      `;
    },

    async submit(shell, quiz, quizId){
      const missing = this.unanswered(shell, quiz);
      if(missing.length){
        ui?.error?.(`Sila jawab semua soalan. Masih belum dijawab: ${missing.length}.`);
        const first = shell.querySelector(`[data-question-id="${CSS.escape(missing[0].id)}"]`);
        first?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }

      const submitButton = shell.querySelector("button[type='submit']");
      ui?.setBusy?.(submitButton, true, "Menyemak...");

      let score = 0;
      const review = [];

      quiz.questions.forEach((question)=>{
        const selected = Array.from(
          shell.querySelectorAll(`input[name="${CSS.escape(question.id)}"]:checked`)
        ).map((input)=>input.value);

        const correct = this.sameAnswer(selected, question.answer);
        if(correct) score += 1;

        this.markOptions(shell, question, selected);
        review.push({
          question: question.question,
          correct,
          selected,
          answer: question.answer,
          feedback: question.feedback
        });
      });

      const total = quiz.questions.length;
      const percent = Math.round((score / total) * 100);
      const passed = percent >= storage.passingScore;
      const durationSeconds = this.durationSeconds(shell);
      const isFinal = quizId === "final";

      let savedState = storage.saveQuizResult(quizId, {
        title: quiz.title,
        score,
        total,
        percent,
        passed,
        durationSeconds
      });

      const result = shell.querySelector(".quiz-result");
      result.innerHTML = this.renderResult(quizId, score, total, percent, passed, review, savedState);
      result.classList.add("show");
      result.scrollIntoView({ behavior: "smooth", block: "start" });
      ui?.setBusy?.(submitButton, false);
      this.disableForm(shell);

      if(isFinal){
        await this.submitFinalScore(shell, savedState);
      }
    },

    unanswered(shell, quiz){
      return quiz.questions.filter((question)=>{
        return !shell.querySelector(`input[name="${CSS.escape(question.id)}"]:checked`);
      });
    },

    durationSeconds(shell){
      const startedAt = Number(shell.dataset.quizStartedAt || Date.now());
      return Math.max(1, Math.round((Date.now() - startedAt) / 1000));
    },

    async submitFinalScore(shell, state){
      const finalState = state.finalAssessment;
      const payload = this.scorePayload(state);
      this.updateSyncStatus(shell, "Menghantar markah ke Google Apps Script...", "loading");

      try{
        const response = await api.saveScore(payload);
        if(response.ok){
          const updated = storage.updateFinalSubmission({
            submitted: true,
            certificateId: response.certificateId || finalState.certificateId || ""
          });
          this.updateCertificateId(shell, updated.certificate.certificateId);
          this.updateSyncStatus(shell, "Markah berjaya dihantar ke Google Sheet.", "success");
          ui?.success?.("Markah berjaya dihantar.");
          return;
        }

        storage.updateFinalSubmission({
          submitted: false,
          errorMessage: response.message
        });
        this.updateSyncStatus(shell, response.message || "Markah belum berjaya dihantar.", "error", true);
        ui?.error?.(response.message || "Markah belum berjaya dihantar.");
      }catch(error){
        storage.updateFinalSubmission({
          submitted: false,
          errorMessage: error.message
        });
        this.updateSyncStatus(shell, "Sambungan gagal. Markah disimpan setempat dan boleh dihantar semula.", "error", true);
        ui?.error?.("Sambungan gagal. Cuba lagi.");
      }

      shell.querySelector("[data-retry-final-sync]")?.addEventListener("click", async ()=>{
        await this.submitFinalScore(shell, storage.load());
      }, { once: true });
    },

    scorePayload(state){
      const finalState = state.finalAssessment;
      const user = state.user;
      return {
        submissionId: finalState.submissionId,
        name: user.name,
        noKp: user.noKp,
        email: user.email,
        position: user.position,
        unit: user.unit || user.department,
        score: finalState.score,
        total: finalState.total,
        percent: finalState.percent,
        status: finalState.status,
        durationSeconds: finalState.durationSeconds,
        durationText: this.formatDuration(finalState.durationSeconds),
        attempt: finalState.attempts,
        certificateId: finalState.certificateId,
        completedAt: finalState.date
      };
    },

    updateSyncStatus(shell, message, type, retry = false){
      const node = shell.querySelector("[data-final-sync]");
      if(!node) return;
      node.className = `sync-panel ${type}`;
      node.innerHTML = `
        <span>${this.escape(message)}</span>
        ${retry ? `<button class="btn btn-outline" type="button" data-retry-final-sync>Cuba Lagi</button>` : ""}
      `;
    },

    updateCertificateId(shell, certificateId){
      shell.querySelectorAll("[data-certificate-id]").forEach((node)=>{
        node.textContent = certificateId || "Menunggu Certificate ID";
      });
    },

    disableForm(shell){
      shell.querySelectorAll("form input, form button").forEach((node)=>{
        node.disabled = true;
      });
    },

    sameAnswer(selected, answer){
      if(selected.length !== answer.length) return false;
      const a = selected.slice().sort();
      const b = answer.slice().sort();
      return a.every((value, index)=>value === b[index]);
    },

    markOptions(shell, question, selected){
      const fieldset = shell.querySelector(`[data-question-id="${CSS.escape(question.id)}"]`);
      fieldset?.querySelectorAll(".option").forEach((label)=>{
        const input = label.querySelector("input");
        const value = input.value;
        label.classList.toggle("correct", question.answer.includes(value));
        label.classList.toggle("incorrect", selected.includes(value) && !question.answer.includes(value));
      });
    },

    renderResult(quizId, score, total, percent, passed, review, state){
      const isFinal = quizId === "final";
      const certificateId = state.certificate.certificateId || state.finalAssessment.certificateId || "";
      return `
        <div class="result-score">${percent}%</div>
        <p class="result-message">
          ${passed ? "Tahniah, anda mencapai markah lulus." : "Belum lulus. Ulang kaji modul dan cuba lagi."}
        </p>
        <p><strong>${score}/${total}</strong> jawapan betul</p>
        ${isFinal ? `
          <p>Masa menjawab: <strong>${this.formatDuration(state.finalAssessment.durationSeconds)}</strong></p>
          <p>Status: <strong>${state.finalAssessment.status}</strong></p>
          ${passed ? `<p>Certificate ID: <strong data-certificate-id>${this.escape(certificateId || "Menunggu Certificate ID")}</strong></p>` : ""}
          <div class="sync-panel loading" data-final-sync>
            <span>Menunggu penghantaran markah...</span>
          </div>
        ` : ""}
        <div class="result-actions">
          ${isFinal && passed ? `<a class="btn btn-primary" href="../certificate/certificate.html">Jana / Lihat Sijil</a>` : ""}
          ${isFinal && !passed && storage.canAttemptFinal() ? `<a class="btn btn-primary" href="final-assessment.html">Cuba Lagi</a>` : ""}
          ${isFinal && !passed ? `<a class="btn btn-outline" href="../dashboard.html">Kembali ke Dashboard</a>` : ""}
          ${!isFinal && passed ? `<button type="button" class="btn btn-primary" onclick="document.getElementById('completeModule')?.scrollIntoView({behavior:'smooth'})">Teruskan Tamat Modul</button>` : ""}
        </div>
        <details class="review-panel">
          <summary>Lihat semakan jawapan</summary>
          ${review.map((item, index)=>`
            <div class="review-item ${item.correct ? "is-correct" : "is-wrong"}">
              <strong>${index + 1}. ${this.escape(item.question)}</strong>
              <p>Jawapan betul: ${this.escape(item.answer.join(", "))}</p>
              <p>${this.escape(item.feedback)}</p>
            </div>
          `).join("")}
        </details>
      `;
    },

    formatDuration(seconds){
      const total = Number(seconds || 0);
      const minutes = Math.floor(total / 60);
      const rest = total % 60;
      if(minutes <= 0) return `${rest} saat`;
      return `${minutes} minit ${rest} saat`;
    },

    shuffle(items){
      const copy = items.slice();
      for(let index = copy.length - 1; index > 0; index -= 1){
        const random = this.randomInt(index + 1);
        [copy[index], copy[random]] = [copy[random], copy[index]];
      }
      return copy;
    },

    randomInt(max){
      if(window.crypto?.getRandomValues){
        const values = new Uint32Array(1);
        window.crypto.getRandomValues(values);
        return values[0] % max;
      }
      return Math.floor(Math.random() * max);
    },

    escape(value){
      const node = document.createElement("span");
      node.textContent = value == null ? "" : String(value);
      return node.innerHTML;
    }
  };

  SPK.Quiz = Quiz;

  document.addEventListener("DOMContentLoaded", ()=>{
    Quiz.init().catch((error)=>{
      console.error(error);
      document.querySelectorAll("[data-quiz]").forEach((shell)=>{
        shell.innerHTML = "<p>Data kuiz tidak dapat dimuatkan.</p>";
      });
    });
  });
})();
