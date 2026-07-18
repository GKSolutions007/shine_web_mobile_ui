function ConfirmDialog(message) {
    var IsAccepted = true;
    $('<div></div>').appendTo('body')
      .html('<div><h6>' + message + '?</h6></div>')
      .dialog({
          modal: true,
          title: 'Confirm Popup',
          zIndex: 10000,
          autoOpen: true,
          width: 'auto',
          resizable: false,
          buttons: {
              Yes: function() {
                  // $(obj).removeAttr('onclick');                                
                  // $(obj).parents('.Parent').remove();

                  //$('body').append('<h1>Confirm Dialog Result: <i>Yes</i></h1>');
                  IsAccepted = true;
                  $(this).dialog("close");
              },
              No: function() {
                  //$('body').append('<h1>Confirm Dialog Result: <i>No</i></h1>');
                  IsAccepted = false;
                  $(this).dialog("close");
              }
          },
          close: function(event, ui) {
              $(this).remove();
              IsAccepted = false;
          }
      });
    return IsAccepted;
};
