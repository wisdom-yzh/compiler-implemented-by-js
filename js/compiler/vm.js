/**
 * vm.js
 * 虚拟机
 */
define(function() {

    // 内存空间
    // 数据存储区分配
    // +-------+
    // | data  | 全局变量
    // +-------+
    // | stack | 局部变量
    // +-------+
    // | heap  | 动态分配
    // +-------+
    var code,             // 代码段
        memory;           // 数据存储区

 
    // 模拟环境
    var status,           // 是否正在运行
        tick,             // 一个指令运行周期
        cycle,            // 当前运行周期
        screen;           // 输出屏幕

    // 寄存器
    var ax,               // 通用寄存器
        ip,               // 代码段指针
        op,               // 当前操作符
        sp,               // ss栈顶指针
        bp;               // 数据段指针

    // 指令集
    const CMD = {
        IMM:  0,          // 立即数num赋给ax
        LC:   1,          // *ax -> ax, *ax is char
        LI:   2,          // *ax -> ax, *ax is int
        LD:   3,          // *ax -> ax, *ax is double
        SC:   4,          // ax值作为char存入某地址,地址存在栈顶
        SI:   5,          // ax值作为int存入某地址,地址存在栈顶
        SD:   6,          // ax值作为double存入某地址,地址存在栈顶
        PUSH: 7,          // ax值入栈
        POPI: 8,          // (int)stack[top] -> ax, pop(top), 仅用于类型转换
        POPC: 9,          // (string)stack[top] -> ax, pop(top), 仅用于类型转换
        POPD: 10,          // (double)stack[top] -> ax, pop(top), 仅用于类型转换
        JMP:  11,          // ip跳转语句
        JNZ:  12,          // ax != 0 时跳转
        JZ:   13,         // ax == 0 时跳转
        CALL: 14,         // 函数调用
        ENT:  15,         // 函数参数进栈
        ADJ:  16,         // sp += <num>
        LEV:  17,         // 函数返回
        LEA:  18,         // 参数所在stack偏移指针载入ax
        OR:   19,         // |
        AND:  20,         // &
        XOR:  21,         // ^ 
        EQ:   22,         // ==
        NE:   23,         // !=
        GT:   24,         // >
        GE:   25,         // >=
        LT:   26,         // <
        LE:   27,         // <=
        SHL:  28,         // <<
        SHR:  29,         // >>
        ADD:  30,         // +
        SUB:  31,         // -
        MUL:  32,         // *
        DIV:  33,         // /
        MOD:  34,         // %
        PRIT: 35,         // print
        EXIT: 36,         // exit
        MALC: 37,         // malloc
    };

    // 指令字节数
    const CMD_BYTE = [
        2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 
        2, 2, 2, 2, 1, 2, 1, 1, 1, 1, 
        1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 
        1, 1, 1, 1, 1
    ];

    /**
     * 实现打印字符的功能
     * @param String str 输出的字符
     * @return int 1
     */
    function print(str) {
        screen.value += str;
        screen.scrollTop = screen.scrollHeight;
        return 1;
    };

    /**
     * 实现堆区动态内存分配
     * @param int size 分配的内存大小
     * @return int address of 0
     */
    function malloc(size) {
        if(size <= 0) {
            return 0;
        }
        for(var i in size) {
            memory.push(0);
        }
        return memory.length;
    }

    /**
     * constructor
     * @param Node screen dom元素,模拟输出的屏幕
     * @param int ds_size 数据段大小限制
     * @param int ss_size 栈段大小限制
     * @return bool
     */
    function vm(dom_screen, ds_size, ss_size) {
        ds_size = ds_size || 512;
        ss_size = ss_size || 512;
        memory = new Array(ds_size + ss_size);
        screen = dom_screen;
    };

    /**
     * 执行汇编代码
     * @param {} asm 汇编代码
     * @return int eval()
     */
    vm.prototype.run = function(asm) {
        if(status) {
            return false;
        }
        // 代码段复制
        code = asm.code;
        // 数据段复制
        for(var index in asm.data) {
            memory[index] = asm.data[index];
        }
        // 初始化registers
        bp = sp = memory.length;
        ip = asm.start_addr;
        // 标记状态
        cycle = 0;
        status = 1;
        return this.eval();
    }

    /**
     * 终止运行
     * @param bool core_dump 是否输出
     */
    vm.prototype.terminate = function(core_dump) {
        if(!status) {
            return false;
        }
        status = 0;
        window.clearInterval(tick);
        if(!core_dump) {
            return true;
        }
        print('aborted!');
        return {
            code: code,
            memory: memory,
            ip: ip,
            sp: sp,
            bp: bp,
            cycle: cycle
        }
    };
    

    /**
     * 指令执行器
     * @return int
     */
    vm.prototype.eval = function() {
        tick = window.setInterval(function() {
            // 读取指令
            op = code[ip++];
            cycle++;
            // 执行操作
            if(op == CMD.IMM)       ax = code[ip++];
            else if(op == CMD.LC)   ax = String(memory[ax]);
            else if(op == CMD.LI)   ax = parseInt(memory[ax]);
            else if(op == CMD.LD)   ax = parseFloat(memory[ax]);
            else if(op == CMD.SC)   memory[memory[sp++]] = String(ax);
            else if(op == CMD.SI)   memory[memory[sp++]] = parseInt(ax);
            else if(op == CMD.SD)   memory[memory[sp++]] = parseFloat(ax);
            else if(op == CMD.POPC) ax = String(memory[sp++]);
            else if(op == CMD.POPI) ax = parseInt(memory[sp++]);
            else if(op == CMD.POPD) ax = parseFloat(memory[sp++]);
            else if(op == CMD.PUSH) memory[--sp] = ax;
            else if(op == CMD.JMP)  ip = code[ip];
            else if(op == CMD.JNZ)  ip = !!ax ? code[ip] : ip + 1;
            else if(op == CMD.JZ)   ip = !ax ? code[ip] : ip + 1;
            else if(op == CMD.CALL) {
                memory[--sp] = ip + 1;
                ip = code[ip];
            }
            else if(op == CMD.ENT) {
                memory[--sp] = bp;    // 父函数bp寄存器存入栈
                bp = sp;
                sp = sp - code[ip++]; // 载入局部变量
            }
            else if(op == CMD.LEV) {
                sp = bp;
                bp = memory[sp++];
                ip = memory[sp++];
            }
            else if(op == CMD.ADJ)  sp = sp + code[ip++];
            else if(op == CMD.LEA)  ax = bp + code[ip++];
            else if(op == CMD.OR)   ax = memory[sp++] | ax;
            else if(op == CMD.AND)  ax = memory[sp++] & ax;
            else if(op == CMD.XOR)  ax = memory[sp++] ^ ax;
            else if(op == CMD.EQ)   ax = memory[sp++] === ax ? 1 : 0;
            else if(op == CMD.NE)   ax = memory[sp++] !== ax ? 1 : 0;
            else if(op == CMD.GT)   ax = memory[sp++] > ax ? 1 : 0;
            else if(op == CMD.GE)   ax = memory[sp++] >= ax ? 1 : 0;
            else if(op == CMD.LT)   ax = memory[sp++] < ax ? 1 : 0;
            else if(op == CMD.LE)   ax = memory[sp++] <= ax ? 1 : 0;
            else if(op == CMD.SHL)  ax = memory[sp++] << ax;
            else if(op == CMD.SHR)  ax = memory[sp++] >> ax;
            else if(op == CMD.ADD)  ax = memory[sp++] + ax;
            else if(op == CMD.SUB)  ax = memory[sp++] - ax;
            else if(op == CMD.MUL)  ax = memory[sp++] * ax;
            else if(op == CMD.DIV)  ax = memory[sp++] / ax;
            else if(op == CMD.MOD)  ax = memory[sp++] % ax;
            else if(op == CMD.PRIT) {
                ax = print(memory[sp]);
            }
            else if(op == CMD.MALC) {
                ax = malloc(memory[sp]);
            }
            else if(op == CMD.EXIT) {
                print('exit(' + memory[sp] + ')\n');
                status = 0;
                window.clearInterval(tick);
            }
        }, 0);
        return true;
    };

    return {
        vm: vm,
        CMD: CMD,
        CMD_BYTE: CMD_BYTE
    }
});
