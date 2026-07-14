"use strict";

(function(){
  const SPK = window.SPK || (window.SPK = {});

  SPK.Config = Object.freeze({
    API_URL: "https://script.google.com/macros/s/AKfycbwcVz-BK6wd2Qaw7kaSaJcUMZ_LsdmwQBbGp0XkuxkN6VeXt0w6UAymg8c0w3HD64l-zQ/exec",
    API_TRANSPORT: "jsonp",
    API_TIMEOUT_MS: 18000,
    PASS_MARK: 80,
    TOTAL_MODULES: 5,
    TOTAL_FINAL_QUESTIONS: 50,
    APP_VERSION: "2026.1.0",
    ORGANIZATION_NAME: "Kolej Vokasional Miri",
    CERTIFICATE_PREFIX: "SPK-2026",
    STORAGE_KEY: "spk-kvmiri-2026-state",
    REGISTRATION_DRAFT_KEY: "spk-kvmiri-2026-registration-draft",
    MAX_ATTEMPT: 3,
    PERFORMANCE_BUCKETS: [
      { label: "0-49", min: 0, max: 49 },
      { label: "50-79", min: 50, max: 79 },
      { label: "80-89", min: 80, max: 89 },
      { label: "90-100", min: 90, max: 100 }
    ],
    ENABLE_DARK_MODE: true,
    ENABLE_GOOGLE_APPS_SCRIPT: true,
    ENABLE_CERTIFICATE_VERIFICATION: true
  });
})();
