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
            console.log(token_list);
        }
            
        var asm;
        try {
            asm = parser.parse(token_list);
        } catch(e) {
            output_device.value += e + '\n';
            return -1;
        }

        if(debug) {
            var asm_decode = []; 
            var cmd_reflect = array_flip(vmachine.CMD);
            for(var i = 0; i < asm['code'].length; i++) {
                asm_decode.push(cmd_reflect[asm['code'][i]] || 'undefined');
                if(vmachine.CMD_BYTE[asm['code'][i]] == 2) {
                    asm_decode.push(asm['code'][++i]);
                }
            }
            console.log(asm['code']);
            console.log(asm_decode);
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
