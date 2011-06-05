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
        updateCacheTimestamp()
        tokenValidator.html('<img src="images/' + (err ? 'error' : 'success') + '.gif"/>');
      });
    }
  });

  function updateCacheTimestamp() {
    if (localStorage.by_prefix_timestamp) {
      var t = new Date(localStorage.by_prefix_timestamp - 0);
      $('#cache-status span').html('generated at <em>'+t.toString().replace(/ GMT.*/, '')+'</em>');
    } else {
      $('#cache-status span').text('has not been generated');
    }
  }

  $('#cache-status button').bind('click', function() {
    $('#cache-status span').html('generated at <img src="images/loading.gif"/>');
    delete localStorage.by_prefix_timestamp;
    GitHub.updateRepoIndex(function(err) {
      if (err) {
        $('#cache-status span').html('generation failed');
      } else {
        updateCacheTimestamp();
      }
    });
  });

  // restore options
  if (localStorage.includePrivate) {
    $('#include-private').get(0).checked = true;
    $('#github').show();
  }
  $('#login').val(localStorage.githubLogin);
  $('#token').val(localStorage.githubToken);
  updateCacheTimestamp();
});
