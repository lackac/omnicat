var currentRequest = null, topResult, currentResults,
    privateIndex, privateRepos;

// Setup options
if (!localStorage.index_type) localStorage.index_type = "by_prefix";

function escapeHTML(text) {
  return text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
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
          path = _parts.shift(), watchers = _parts.shift(), description = _parts.join(" "),
          match;

      if (path[0] == '*') {
        match = '<url><match>' + path.substr(1) + '</match></url>';
      } else {
        match = '<match>' + path + '</match>';
      }

      description = match + ' <dim>' + watchers + '</dim> <dim>' + escapeHTML(description) + '</dim>';

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
  if (suggestion) {
    chrome.omnibox.setDefaultSuggestion({ description: suggestion });
  } else {
    chrome.omnibox.setDefaultSuggestion({
      description: '<url><match>https://github.com/</match></url> <match>owner/repo</match>'
    });
  }
}

chrome.omnibox.onInputStarted.addListener(function() {
  topResult = null;
  currentResults = [];
  updateDefaultSuggestion('');
  if (localStorage.includePrivate) {
    GitHub.updateRepoIndex(function(err) {
      if (!err) {
        privateIndex = JSON.parse(localStorage[localStorage.index_type]);
        privateRepos = JSON.parse(localStorage.repos);
      }
    });
    if (localStorage[localStorage.index_type] && localStorage.repos) {
      privateIndex = JSON.parse(localStorage[localStorage.index_type]);
      privateRepos = JSON.parse(localStorage.repos);
    }
  }
});

chrome.omnibox.onInputCancelled.addListener(function() {
  resetDefaultSuggestion();
});

function uniqLines(lines) {
  var uniq = [], lookup = {};
  lines.forEach(function(line) {
    var match = line.match(/^\*?([^ ]+) /), id = match && match[1];
    if (id && !lookup[id]) {
      lookup[id] = true;
      uniq.push(line);
    }
  });
  return uniq;
}

function complete(query, callback) {
  if (localStorage.index_type == "by_prefix") {
    query = query.replace(/^\/|\/$/g, '').toLowerCase();
  } else {
    query = query.toLowerCase().replace(/[^a-z0-9]/g, '');
  }
  var url =
    (localStorage.DB == "default" ? "https://omnicat.cloudant.com/gh-repos" : localStorage.DB) +
    '/_design/repos/_list/complete/' +
    localStorage.index_type +
    '?startkey=["' + query + '",{}]&endkey=["' + query + '"]' +
    '&descending=true&limit=10&stale=ok';

  // First gather private repos and send them on immediately
  var privateLines = [];
  if (privateIndex && privateIndex[query] && privateRepos) {
    privateLines = privateIndex[query].map(function(repo) {
      return '*' + privateRepos[repo];
    });
    privateLines = uniqLines(privateLines);
    callback(privateLines);
  }

  // Only make the request if there are not enough private repos
  if (privateLines.length < 6) {
    return $.get(url, function(lines) {
      lines = lines.split("\n");
      callback(uniqLines(privateLines.concat(lines)));
    });
  }
}

function getUrl(path) {
  if (path[0] == '*') path = path.substr(1);
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
