// Data source: the sample dataset in data/sample.csv, served with the site so it loads on any network.
// Every number on the page is read from that file (or the visitor's own data) or derived from it.
window.APP_CONFIG = {
  sampleUrl: "data/sample.csv",
  contentUrl: "content/blindspots.json",
  explainUrl: "/api/explain",
  insightsUrl: "/api/insights",
};
