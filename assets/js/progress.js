"use strict";

(function(){
  const SPK = window.SPK || (window.SPK = {});

  SPK.Progress = {
    refresh(){
      SPK.App?.renderProgressBadges?.();
    },
    completeModule(moduleId, moduleName, xp, badge){
      SPK.Storage?.completeModule?.(moduleId, xp, badge || moduleName);
      this.refresh();
    },
    summary(){
      return SPK.Storage?.summary?.();
    }
  };
})();
