/**
 * compiler.js
 * 编译器
 */
define(['parser', 'token', 'vm'], function(parser, tokenizer, vmachine) {
    
    /**
     * virtual machine
     */
    var vm;

    /**
     * flip key <=> value of a object
     */
    function array_flip(obj) {
        var result = {};
        for(var key in obj) {
            if(!result.hasOwnProperty(obj[key]) && obj.hasOwnProperty(key)) {
                result[obj[key]] = key;
            }
        }
        return result;
    }

    /**
     * compile and run
     * @param string input_source source code
     * @param Node output_device output dom element
     * @param bool debug output debug info or not
     */
    function go(input_source, output_device, debug) {
        var src = input_source + '\0';
        var token_list = tokenizer.tokenizer(src);
        if(debug) {
            console.info('TOKEN LIST');
            token_list.forEach(function(row) {
                console.log(row.value);
            });
        }
            
        var asm;
        try {
            asm = parser.parse(token_list);
        } catch(e) {
            output_device.value += e + '\n';
            return -1;
        }

        if(debug) {
            var cmd_reflect = array_flip(vmachine.CMD), 
                line;
            console.info('ASM CODE');
            for(var i = 0; i < asm['code'].length; i++) {
                line = i + '\t';
                line += ' | ' + cmd_reflect[asm['code'][i]] || 'UNKNOWN!';
                if(vmachine.CMD_BYTE[asm['code'][i]] == 2) {
                    line += ' ' + asm['code'][++i];
                }
                console.log(line);
            }
        }

        vm = new vmachine.vm(output_device);
        return vm.run(asm);
    }

    /**
     * 终止运行
     * @param bool core_dump 导出当前asm字节码
     */
    function terminate(core_dump) {
        if(vm) {
            return vm.terminate(core_dump);
        }
        return false;
    }

    return {
        array_flip: array_flip,
        go: go,
        terminate: terminate
    }
});
