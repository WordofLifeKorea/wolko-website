(function (window) {
  let finalized = false;

  function finalizeRevisions() {
    if (finalized) return;
    finalized = true;
    window.Asc.plugin.executeMethod('AcceptReviewChanges', [true], function () {
      window.Asc.plugin.executeCommand('close', '');
    });
  }

  window.Asc.plugin.init = function () {};
  window.Asc.plugin.event_onDocumentContentReady = finalizeRevisions;
})(window);
