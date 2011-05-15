var currentRequest = null;

chrome.omnibox.onInputChanged.addListener(function(text, suggest) {
  if (currentRequest != null) {
    currentRequest.onreadystatechange = null;
    currentRequest.abort();
    currentRequest = null;
  }

  updateDefaultSuggestion(text);
  if (text == '') return;

  currentRequest = complete(text, function(lines) {
    lines = lines.split("\n");
    var results = [];

    for (var i = 0, line; i < lines.length && (line = lines[i]); i++) {
      var _parts = line.split(" "),
          path = _parts.shift(), watchers = _parts.shift(), description = _parts.join(" ");
          description = '<url>' + path + '</url> <dim>' + watchers + '</dim> <dim>' + description + '</dim>';

      results.push({ content: path, description: description });
    }

    suggest(results);
  });
});

function resetDefaultSuggestion() {
  chrome.omnibox.setDefaultSuggestion({
    description: '<url><match>gh:</match></url> Autocomplete GitHub repositories'
  });
}

resetDefaultSuggestion();

function updateDefaultSuggestion(query) {
  query = query.replace(/^\/|\/$/g, '');
  var _parts = query.split("/"), owner = _parts[0], repo = _parts[1], othermatch = '';
  if (!owner && !repo) {
    owner = 'owner'; repo = 'repo';
  } else if (!repo) {
    repo = owner + '*'; owner = '*';
    othermatch = ' <dim>|</dim> <match>' + repo + '/' + owner + '</match>';
  } else {
    repo += '*';
    owner += '*';
  }
  chrome.omnibox.setDefaultSuggestion({
    description: '<url><match>https://github.com/</match></url> <match>' + owner + '/' + repo + '</match>' + othermatch
  });
}

chrome.omnibox.onInputStarted.addListener(function() {
  updateDefaultSuggestion('');
});

chrome.omnibox.onInputCancelled.addListener(function() {
  resetDefaultSuggestion();
});

function complete(query, callback) {
  query = query.replace(/^\/|\/$/g, '');
  var url = 'https://lackac.cloudant.com/gh-repos/_design/repos/_list/complete/by_prefix' +
    '?startkey=["' + query + '",{}]&endkey=["' + query + '"]&descending=true&limit=5&stale=ok';

  var req = new XMLHttpRequest();
  req.open("GET", url, true);
  req.onreadystatechange = function() {
    if (req.readyState == 4) {
      callback(req.responseText);
    }
  }
  req.send(null);
  return req;
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
  navigate(getUrl(text));
});
