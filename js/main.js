require.config({
    baseUrl: 'js',
    paths: {
        compiler: 'compiler/compiler',
        token:    'compiler/token',
        vm:       'compiler/vm',
        parser:   'compiler/parser',
        jquery:   'jquery.min'
    }
});

require(['jquery', 'compiler'], function($, compiler) {
    
    $('#run')
    .bind('click', function() {
        var source = $('#source').val();
        window.localStorage.source = source;
        compiler.go(source, $('#result')[0], true);
    });

    $('#terminate')
    .bind('click', function() {
        var core_dump = compiler.terminate(true);
        console.log(core_dump);
    });

    $('#source')
    .bind('keydown', function(e) {
        if(e.keyCode == 9) {
            $(this).val($(this).val() + '    ');
            return false;
        }
    })
    .val(window.localStorage.source || '');
});
