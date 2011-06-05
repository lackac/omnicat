var currentRequest = null, topResult, currentResults,
    DB, defaultDB = "https://lackac.cloudant.com/gh-repos";

if (localStorage.DB) DB = localStorage.DB;
if (!DB || DB === "default") DB = defaultDB;

function toggleDevMode() {
  localStorage.devMode = localStorage.devMode === "on" ? "off" : "on";
  if (localStorage.devMode === "on") {
    localStorage.DB = DB = "http://localhost:5984/gh-repos";
    return "enabled";
  } else {
    localStorage.DB = "default";
    DB = defaultDB;
    return "disabled";
  }
}

chrome.omnibox.onInputChanged.addListener(function(text, suggest) {
  if (currentRequest != null) {
    currentRequest.abort();
    currentRequest = null;
  }

  updateDefaultSuggestion(text);
  if (text == '') return;

  currentRequest = complete(text, function(lines) {
    topResult = null;
    currentResults = [];

    for (var i = 0, line; i < lines.length && (line = lines[i]); i++) {
      var _parts = line.split(" "),
          path = _parts.shift(), watchers = _parts.shift(), description = _parts.join(" ");

      description = '<match>' + path + '</match> <dim>' + watchers + '</dim> <dim>' + description + '</dim>';

      if (i === 0) {
        topResult = path;
        updateDefaultSuggestion(description);
      } else {
        currentResults.push({ content: path, description: description });
      }
    }

    suggest(currentResults);
  });
});

function resetDefaultSuggestion() {
  chrome.omnibox.setDefaultSuggestion({
    description: '<url><match>gh:</match></url> Autocomplete GitHub repositories'
  });
}

resetDefaultSuggestion();

function updateDefaultSuggestion(suggestion) {
  chrome.omnibox.setDefaultSuggestion({
    description: '<url><match>https://github.com/</match></url>' + (suggestion || '<match>owner/repo</match>')
  });
}

chrome.omnibox.onInputStarted.addListener(function() {
  topResult = null;
  currentResults = [];
  updateDefaultSuggestion('');
});

chrome.omnibox.onInputCancelled.addListener(function() {
  resetDefaultSuggestion();
});

function complete(query, callback) {
  query = query.replace(/^\/|\/$/g, '').toLowerCase();
  var url = DB + '/_design/repos/_list/complete/by_prefix' +
    '?startkey=["' + query + '",{}]&endkey=["' + query + '"]&descending=true&limit=10&stale=ok';

  return $.get(url, function(lines) {
    lines = lines.split("\n");
    var uniqLines = [], lookup = {};
    lines.forEach(function(line) {
      var match = line.match(/^\*?([^ ]+) /), id = match && match[1];
      if (id && !lookup[id]) {
        lookup[id] = true;
        uniqLines.push(line);
      }
    });
    callback(uniqLines);
  });
}

function getUrl(path) {
  return 'https://github.com/' + path;
}

function navigate(url) {
  chrome.tabs.getSelected(null, function(tab) {
    chrome.tabs.update(tab.id, {url: url});
  });
}

chrome.omnibox.onInputEntered.addListener(function(text) {
  for (var i = 0; i < currentResults.length; i++) {
    if (currentResults[i].content === text) {
      return navigate(getUrl(text));
    }
  }
  navigate(getUrl(topResult || "search"));
});
