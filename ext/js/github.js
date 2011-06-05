(function() {

window.GitHub = {
  updateCredentials: function(login, token, callback) {
    var t;
    localStorage.githubLogin = localStorage.githubToken = "";
    $.ajax({
      url: 'https://github.com/api/v2/json/user/show?login='+login+'&token='+token+'&callback=?',
      dataType: 'json',
      success: function(data) {
        if (t) {
          clearTimeout(t);
          localStorage.githubLogin = login;
          localStorage.githubToken = token;
          callback(true);
        }
      }
    });
    t = setTimeout(function() { callback(false); }, 3000);
  }
}

})();
