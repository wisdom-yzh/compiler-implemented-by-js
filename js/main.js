var compiler = require('./compiler/compiler.js');

$(function() {

	$('#run').bind('click', function() {
		var source = $('#source').val();
		window.localStorage.setItem('source', source);
		compiler.go(source, $('#result')[0], true);
	});

	$('#terminate').bind('click', function() {
		var core_dump = compiler.terminate(true);
		console.log(core_dump);
	});

	$('#source').bind('keydown', function(e) {
		if(e.keyCode == 9) {
			$(this).val($(this).val() + '    ');
			return false;
		}
	})

	$('#source').val(window.localStorage.source || '');
});
