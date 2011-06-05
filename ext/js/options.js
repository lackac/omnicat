$(function() {

  $('#include-private').bind('click', function(e) {
    if (this.checked) {
      localStorage.includePrivate = "yes";
      $('#github').show();
    } else {
      delete localStorage.includePrivate;
      $('#github').hide();
    }
  });

  $('#token, #login').bind('change', function() {
    var login = $('#login').val(), token = $('#token').val(),
        tokenValidator = $('#token-validator');
    if (login && token) {
      tokenValidator.html('<img src="images/loading.gif"/>');
      GitHub.updateCredentials(login, token, function(err) {
        tokenValidator.html('<img src="images/' + (err ? 'error' : 'success') + '.gif"/>');
      });
    }
  });

  // restore options
  if (localStorage.includePrivate) {
    $('#include-private').get(0).checked = true;
    $('#github').show();
  }
  $('#login').val(localStorage.githubLogin);
  $('#token').val(localStorage.githubToken);
});
