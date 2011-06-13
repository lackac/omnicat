(function() {

window.GitHub = {
  request: function(path, login, token, callback) {
    if (typeof login == "function") {
      callback = login;
      if (localStorage.githubLogin && localStorage.githubToken) {
        login = localStorage.githubLogin;
        token = localStorage.githubToken;
      } else {
        return callback("no token");
      }
    }
    var url = /^https:\/\//.test(path) ? path : 'https://github.com/api/v2/json/'+path+(path.indexOf('?') == -1 ? '?' : '&')+'login='+login+'&token='+token;
    $.ajax({
      url: url, dataType: 'json',
      success: function(data, status, xhr) {
        var headers = xhr.getAllResponseHeaders().split("\n").reduce(function(hash, line) {
          var match = line.match(/^([^:]*): (.*)/);
          if (match) hash[match[1]] = match[2];
          return hash;
        }, {});
        callback(null, data, headers);
      },
      error: function(xhr, error) { callback(error); }
    });
  },

  updateCredentials: function(login, token, callback) {
    localStorage.githubLogin = localStorage.githubToken = "";
    this.clearRepoIndex();
    this.request('user/show', login, token, function(err, data) {
      if (!err) {
        localStorage.githubLogin = login;
        localStorage.githubToken = token;
      }
      callback(err, data);
    });
  },

  fetchRepos: function(callback) {
    var repos = [],
        paths = ['repos/show/'+localStorage.githubLogin, 'organizations/repositories', 'repos/pushable'],
        done = 0;
    paths.forEach(function(path) {
      GitHub.request(path, function handleResponse(err, data, headers) {
        // another path have failed, skip anything else
        if (done == -1) return;
        if (err) {
          done = -1;
          return callback(err);
        }
        repos = repos.concat(data.repositories);
        if (headers['X-Next']) {
          GitHub.request(headers['X-Next'], handleResponse);
        } else {
          done += 1;
          if (done == paths.length) {
            callback(null, repos);
          }
        }
      });
    });
  },

  updateRepoIndex: function(callback) {
    if (callback === undefined) callback = function() {}
    // do not update if index is recent
    if (localStorage.index_timestamp && (new Date().getTime()) - localStorage.index_timestamp < 86400000) {
      return callback("index is recent");
    }

    this.fetchRepos(function(err, repos) {
      if (err) return callback(err);
      var index = { by_prefix: {}, by_fuzzy: {} }, repoLookup = {};

      function addToIndex(index_type, key, repo) {
        if (index[index_type][key] === undefined) {
          index[index_type][key] = [];
        }
        var id = repo.owner + '/' + repo.name;
        if (!repoLookup[id]) repoLookup[id] = id + ' ('+repo.watchers+') ' + repo.description;
        index[index_type][key].push(id);
      }

      repos.sort(function(a, b) {
        return a.pushed_at < b.pushed_at ? 1 : a.pushed_at > b.pushed_at ? -1 : 0;
      }).forEach(function(repo) {
        var i, j, l1, l2;

        // by_prefix index
        // all prefixes of name
        for (i = 1, l1 = repo.name.length; i <= l1; i++) {
          addToIndex("by_prefix", repo.name.substr(0, i).toLowerCase(), repo);
        }
        // all prefixes of owner
        for (i = 1, l1 = repo.owner.length; i <= l1; i++) {
          var prefix = repo.owner.substr(0, i).toLowerCase();
          addToIndex("by_prefix", prefix, repo);
          // combine with all prefixes of name
          for (j = 1, l2 = repo.name.length; j <= l2; j++) {
            addToIndex("by_prefix", prefix + '/' + repo.name.substr(0, j), repo);
          }
        }

        // by_fuzzy index
        var id = repo.owner + ':' + repo.name;
        if (id.indexOf('_') === -1 && id.indexOf('-') === -1) id = id.replace(/([A-Z][^A-Z])/g, '-$1');
        var words = id.toLowerCase().split(/[^a-z0-9]+/).filter(function(s) { return s.length > 0; }),
            cmbs = combinations(words, 4);
        for (i = 0, l1 = cmbs.length; i < l1; i++) {
          var combination = cmbs[i], max = combination.length < 4 ? undefined : 4,
              prevars = prefixVariations(combination, max);
          for (j = 0, l2 = prevars.length; j < l2; j++) {
            addToIndex("by_fuzzy", prevars[j], repo);
          }
        }
        if (words.length > 4 || combination.length > 3 && words.some(function(w) { return w.length > 4; })) {
          addToIndex("by_fuzzy", id.toLowerCase().replace(/[^a-z0-9]/g, ''), repo);
        }
      });
      localStorage.by_prefix = JSON.stringify(index.by_prefix);
      localStorage.by_fuzzy = JSON.stringify(index.by_fuzzy);
      localStorage.index_timestamp = new Date().getTime();
      localStorage.repos = JSON.stringify(repoLookup);
      callback(null, localStorage.index_timestamp);
    });
  },

  clearRepoIndex: function() {
    delete localStorage.by_prefix;
    delete localStorage.by_fuzzy;
    delete localStorage.index_timestamp;
    delete localStorage.repos;
  }
}


// compiled functions from the by_fuzzy couchdb view
// TODO: find a way to keep these db and local indexing function in sync
function combinations(arr, max) {
  var all, combine, i;
  combine = function(n, src, got, all) {
    var item, j, _len;
    if (n === 0) {
      if (got.length > 0) {
        all[all.length] = got;
      }
      return;
    }
    for (j = 0, _len = src.length; j < _len; j++) {
      item = src[j];
      combine(n - 1, src.slice(j + 1), got.concat([item]), all);
    }
  };
  all = [];
  if (!(max && max < arr.length)) {
    max = arr.length;
  }
  for (i = 1; 1 <= max ? i <= max : i >= max; 1 <= max ? i++ : i--) {
    combine(i, arr, [], all);
  }
  return all;
};
function prefixVariations(words, max, got) {
  var all, current, i, max_length, _results;
  if (got == null) {
    got = [];
  }
  current = words[0];
  max_length = max && max < current.length ? max : current.length;
  if (words.length > 1) {
    all = [];
    for (i = 1; 1 <= max_length ? i <= max_length : i >= max_length; 1 <= max_length ? i++ : i--) {
      all = all.concat(prefixVariations(words.slice(1), max, got.concat([current.substr(0, i)])));
    }
    return all;
  } else {
    _results = [];
    for (i = 1; 1 <= max_length ? i <= max_length : i >= max_length; 1 <= max_length ? i++ : i--) {
      _results.push(got.concat([current.substr(0, i)]).join(''));
    }
    return _results;
  }
};

})();
