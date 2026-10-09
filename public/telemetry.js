(function(){
  try {
    if (typeof window === "undefined") return;
    var d = document;
    var s = d.currentScript || d.querySelector("script[data-site]");
    var site = s ? s.getAttribute("data-site") : (window.__TELEMETRY_SITE__ || null);
    if (!site) return;
    var payload = JSON.stringify({
      site: site,
      path: window.location.pathname || "/",
      ref: d.referrer || ""
    });
    var url = "https://garmgoon.com/api/telemetry";
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, new Blob([payload], { type: "text/plain" }));
    } else {
      fetch(url, {
        method: "POST",
        body: payload,
        headers: { "Content-Type": "text/plain" },
        keepalive: true,
        mode: "cors"
      }).catch(function(){});
    }
  } catch(e){}
})();
