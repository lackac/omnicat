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
    $.ajax({
      url: 'https://github.com/api/v2/json/'+path+'?login='+login+'&token='+token,
      dataType: 'json',
      success: function(data) { callback(null, data); },
      error: function(xhr, error) { callback(error); }
    });
  },

  updateCredentials: function(login, token, callback) {
    localStorage.githubLogin = localStorage.githubToken = "";
    this.request('user/show', login, token, function(err, data) {
      if (!err) {
        localStorage.githubLogin = login;
        localStorage.githubToken = token;
      }
      callback(err, data);
    });
  }
}

})();
