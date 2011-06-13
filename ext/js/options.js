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
    if (localStorage.index_timestamp) {
      var t = new Date(localStorage.index_timestamp - 0);
      $('#cache-status span').html('generated at <em>'+t.toString().replace(/ GMT.*/, '')+'</em>');
    } else {
      $('#cache-status span').text('has not been generated');
    }
  }

  $('#cache-status button').bind('click', function() {
    $('#cache-status span').html('generated at <img src="images/loading.gif"/>');
    delete localStorage.index_timestamp;
    GitHub.updateRepoIndex(function(err) {
      if (err) {
        $('#cache-status span').html('generation failed');
      } else {
        updateCacheTimestamp();
      }
    });
  });

  $('#expopts').bind('click', function() {
    if (this.checked) {
      localStorage.experimental = "yes";
      $('#experimental').show();
    } else {
      delete localStorage.experimental;
      $('#experimental').hide();
    }
  });

  $('input[name=index_type]').bind('click', function() {
    localStorage.index_type = $(this).val();
  });

  $('input[name=db]').bind('click', function() {
    if ($(this).val() == "default") {
      localStorage.DB = "default";
      $('#custom-db').get(0).disabled = true;
    } else {
      localStorage.DB = $('#custom-db').val();
      $('#custom-db').get(0).disabled = false;
    }
  });

  // restore options
  if (localStorage.includePrivate) {
    $('#include-private').get(0).checked = true;
    $('#github').show();
  }
  $('#login').val(localStorage.githubLogin);
  $('#token').val(localStorage.githubToken);
  updateCacheTimestamp();

  if (localStorage.experimental) {
    $('#expopts').get(0).checked = true;
    $('#experimental').show();
  }
  $('input[name=index_type][value='+(localStorage.index_type || "by_prefix")+']').get(0).checked = true;
  if (localStorage.DB && localStorage.DB != "default") {
    $('#custom-db').val(localStorage.DB);
    $('#custom-db').get(0).disabled = false;
    $('#db-custom').get(0).checked = true;
  } else {
    $('#custom-db').val("http://localhost:5984/gh-repos");
    $('#custom-db').get(0).disabled = true;
    $('#db-default').get(0).checked = true;
  }
});
