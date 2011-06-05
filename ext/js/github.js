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
    if (localStorage.by_prefix_timestamp && (new Date().getTime()) - localStorage.by_prefix_timestamp < 86400000) {
      return callback("index is recent");
    }

    this.fetchRepos(function(err, repos) {
      if (err) return callback(err);
      var index = {}, repoLookup = {};

      function addToIndex(key, repo) {
        if (index[key] === undefined) {
          index[key] = [];
        }
        var id = repo.owner + '/' + repo.name;
        if (!repoLookup[id]) repoLookup[id] = id + ' ('+repo.watchers+') ' + repo.description;
        index[key].push(id);
      }

      repos.sort(function(a, b) {
        return a.pushed_at < b.pushed_at ? 1 : a.pushed_at > b.pushed_at ? -1 : 0;
      }).forEach(function(repo) {
        var i, j, l1, l2;
        // all prefixes of name
        for (i = 1, l1 = repo.name.length; i <= l1; i++) {
          addToIndex(repo.name.substr(0, i).toLowerCase(), repo);
        }
        // all prefixes of owner
        for (i = 1, l1 = repo.owner.length; i <= l1; i++) {
          var prefix = repo.owner.substr(0, i).toLowerCase();
          addToIndex(prefix, repo);
          // combine with all prefixes of name
          for (j = 1, l2 = repo.name.length; j <= l2; j++) {
            addToIndex(prefix + '/' + repo.name.substr(0, j), repo);
          }
        }
      });
      localStorage.by_prefix = JSON.stringify(index);
      localStorage.by_prefix_timestamp = new Date().getTime();
      localStorage.repos = JSON.stringify(repoLookup);
      callback(null, localStorage.by_prefix_timestamp);
    });
  },

  clearRepoIndex: function() {
    delete localStorage.by_prefix;
    delete localStorage.by_prefix_timestamp;
    delete localStorage.repos;
  }
}

})();
