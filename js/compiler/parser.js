/**
 * parser.js
 * 语法分析
 */
define(['token', 'vm'], function(tokenizer, vmachine) {

    /**
     * 虚拟机汇编指vmachine令
     */
    const CMD = vmachine.CMD;

    /**
     * token类型枚举
     */
    const TYPE = tokenizer.TYPE;
        
    /**
     * tokens
     */
    var token_list = [],    // token list
        token,              // current token
        variable_list = {}, // 变量列表
        function_list = {}, // 函数列表
        local_list = {};    // 局部变量列表
    
    /**
     * 汇编代码
     */
    var asm = {},                     // 最终生成的汇编代码
        asm_code = [],                // 代码
        asm_data = [],                // 数据数组
        index_bp = 0;                 // 函数体内部数据栈指针

    /**
     * enum变量类型
     * x % 2 == 0 --> int
     * x % 2 != 0 --> char
     * x / 2      --> '*'的个数
     */
    const VAR_TYPE = {
        INT:  0,
        CHAR: 1,
        PTR:  2
    };

    /**
     * 当前表达式返回变量类型
     */
    var expr_type;

    /**
     * 返回下一个token
     */
    function next() {
        token = token_list.shift();
    }

    /**
     * 匹配数据类型
     * type {'*'} id
     * @return VAR_TYPE
     */
    function get_type() {
        var var_type = VAR_TYPE.INT;
        if(token.match(TYPE.SYMBOLS ,'int')) {
            var_type = VAR_TYPE.INT;
        } else if(token.match(TYPE.SYMBOLS, 'char')) {
            var_type = VAR_TYPE.CHAR;
        } else {
            throw_exception('error to get type of variable');
        }
        next();

        while(token.match(TYPE.SYMBOLS, '*')) {
            var_type += VAR_TYPE.PTR;
            next();
        }
        return var_type;
    }

    /**
     * 全局变量定义式:全局变量赋初值只能为常数
     * variable_decl ::= type {'*'} id {',' {'*'} id };
     */
    function variable_decl() {
        var var_type = get_type();
        while(!token.match(TYPE.SYMBOLS, ';')) {
            if(!token.match(TYPE.VARIABLE)) {
                throw_exception('bad global declaration');
            }
            if(Object.keys(variable_list).indexOf(token.value) != -1) {
                throw_exception('duplicate variable declaration');
            }
            variable_list[token.value] = {
                var_addr: asm_data.length, // 新增地址
                var_type: var_type
            };
            asm_data.push(0);
            next();
            // 全局变量赋初值
            if(token.match(TYPE.SYMBOLS, '=')) {
                next();
                if(token.match(TYPE.NUMBER) && var_type % 2 == 0) {
                    asm_data[asm_data.length - 1] = parseInt(token.value);
                } else if(token.match(TYPE.STRING && var_type % 2 == 1)) {
                    asm_data[asm_data.length - 1] = token.value;
                } else {
                    throw_exception('全局变量初值赋值错误');
                }
                next();
            }
            // 跳过 ,
            if(token.match(TYPE.SYMBOLS, ',')) {
                next();
            }
        }
        next();
    }

    /**
     * 函数定义式
     * function_decl ::= type {'*'} id '(' func_param_decl ')' '{' func_body_decl '}'
     */
    function function_decl() {
        var var_type = get_type();
        if(!token.match(TYPE.VARIABLE)) {
            throw_exception('bad global function declaration');
        }
        if(Object.keys(function_list).indexOf(token.value) != -1) {
            throw_exception('duplicate variable declaration');
        }
        function_list[token.value] = {
            var_addr: asm_code.length, // 新增地址
            var_type: var_type
        };
        next();
        token.match(TYPE.SYMBOLS, '(') ? next() : throw_exception();
        func_param_decl();
        token.match(TYPE.SYMBOLS, ')') ? next() : throw_exception();
        token.match(TYPE.SYMBOLS, '{') ? next() : throw_exception();
        func_body_decl();
        token.match(TYPE.SYMBOLS, '}') ? next() : throw_exception();
    }

    /**
     * 函数参数定义式
     * func_param_decl ::= {type {'*'} id ,}
     */
    function func_param_decl() {
        while(!token.match(TYPE.SYMBOLS, ')')) {
            var var_type = get_type();
            if(!token.match(TYPE.VARIABLE)) {
                throw_exception('bad function param declaration');
            }
            if(Object.keys(local_list).indexOf(token.value) != -1) {
                throw_exception('duplicate local variable declaration');
            }
            local_list[token.value] = {
                var_addr: index_bp++, // 新增地址
                var_type: var_type
            };
            next();
            if(token.match(TYPE.SYMBOLS, ',')) {
                next(); // jump over ','
            }
        }
        index_bp++;
    }

    /**
     * 函数体定义式
     * func_body_decl ::= {variable_decl}, {statement}
     */
    function func_body_decl() {
        var pos_local = index_bp; // 内部变量所在栈段地址
        // 局部变量定义,变量个数x暂时未知,先暂存起来: ENT x
        asm_code.push(CMD.ENT);
        var p = asm_code.length;
        asm_code.push(0);
        while(token.match(TYPE.SYMBOLS, 'char') || token.match(TYPE.SYMBOLS, 'int')) {
            // 获得基础数据类型(int or char)
            var base_type = VAR_TYPE.INT;
            if(token.match(TYPE.SYMBOLS ,'int')) {
                base_type = VAR_TYPE.INT;
            } else if(token.match(TYPE.SYMBOLS, 'char')) {
                base_type = VAR_TYPE.CHAR;
            } else {
                throw_exception('error to get type of variable');
            }
            next();
            // 获得变量名称及初始化类型
            while(!token.match(TYPE.SYMBOLS, ';')) {
                var var_type = base_type;
                while(token.match(TYPE.SYMBOLS, '*')) {
                    var_type += VAR_TYPE.PTR;
                    next();
                }
                if(!token.match(TYPE.VARIABLE)) {
                    throw_exception('bad local declaration');
                }
                if(Object.keys(local_list).indexOf(token.value) != -1) {
                    throw_exception('duplicate local variable declaration');
                }
                local_list[token.value] = {
                    var_addr: ++pos_local, // 新增地址
                    var_type: var_type
                };
                next();
                // 局部变量赋初值
                if(token.match(TYPE.SYMBOLS, '=')) {
                    next();
                    asm_code.push(CMD.LEA);
                    asm_code.push(index_bp - pos_local); // 局部变量的偏移地址
                    asm_code.push(CMD.PUSH);
                    expression(lv('='));
                    asm_code.push(var_type % 2 == 0 ? CMD.SI : CMD.SC);
                }
                // 跳过 , 
                if(token.match(TYPE.SYMBOLS, ',')) {
                    next();
                }             
            }
            next();
        }
        asm_code[p] = pos_local - index_bp;
        // 语句定义
        while(!token.match(TYPE.SYMBOLS, '}')) {
            statement();
        }
        // 退出后清空局部变量
        local_list = {};
    }

    /**
     * 7种语句类型
     * 1) if(...) <statement> [else <statement>]
     * 2) while(...) <statement>
     * 3) for(<statement> <statement> <statement>) <statement>
     * 4) { <statement> }
     * 5) return xxx;
     * 6) <empty statement>;
     * 7) expression; (expression end with semicolon)
     */
    function statement() {
        if(token.match(TYPE.SYMBOLS, 'if')) { // if语句
            next();
            statement_if();
        } else if(token.match(TYPE.SYMBOLS, 'while')) {
            next();
            statement_while();
        } else if(token.match(TYPE.SYMBOLS, 'for')) {
            next();
            statement_for();
        } else if(token.match(TYPE.SYMBOLS, 'return')) {
            next();
            statement_return();
        } else if(token.match(TYPE.SYMBOLS, '{')) {
            next();
            while(!token.match(TYPE.SYMBOLS, '}')) {
                statement();
            }
            next();
        } else if(token.match(TYPE.SYMBOLS, ';')){ // empty
            next();
        } else {
            expression(0);
            token.match(TYPE.SYMBOLS, ';') ? next() : throw_exception();
        }
    }

    /**
     * if条件语句的处理
     * if (...) <statement> [else <statement>]
     *
     *   if (<cond>)                 <cond>
     *                               JZ a
     *   <true_statement>   ===>     <true_statement>
     *   else:                       JMP b 如果有else,则需要跳过a的部分
     * a:<false_statement>         a:<false_statement>
     * b: ...                      b: ...
     */
    function statement_if() {
        token.match(TYPE.SYMBOLS, '(') ? next() : throw_exception();
        expression(0);
        token.match(TYPE.SYMBOLS, ')') ? next() : throw_exception();

        asm_code.push(CMD.JZ);
        // 预留跳转的新地址                         
        var a = asm_code.length;    // JZ a
        asm_code.push(0);
        statement();                // <true_statement>
        if(token.match(TYPE.SYMBOLS, 'else')) {
            next();
            asm_code.push(CMD.JMP);
            var b = asm_code.length;
            asm_code.push(0);
            asm_code[a] = asm_code.length;
            statement();            // <false_statement>
            asm_code[b] = asm_code.length;
        } else {
            asm_code[a] = asm_code.length;
        }
    }

    /**
     * while条件语句的处理
     * while (...) { <loop_statement> }
     *
     * a:while (<cond>)            a: <cond>
     *   <loop_statement>  ===>       JZ b
     * b:   ...                       <loop_statement>
     *                                JMP a
     *                             b: ...
     */
    function statement_while() {
        var a = asm_code.length;
        token.match(TYPE.SYMBOLS, '(') ? next() : throw_exception();
        expression(0);
        token.match(TYPE.SYMBOLS, ')') ? next() : throw_exception();
        
        asm_code.push(CMD.JZ);
        var b = asm_code.length;
        asm_code.push(0);
        statement();
        asm_code.push(CMD.JMP);
        asm_code.push(a);
        asm_code[b] = asm_code.length;
    }

    /**
     * for语句的处理
     * for(expression1; expression2; expression3) { <loop_statement> }
     *      <expr1>
     * a:   <expr2>
     *       JZ  b
     *       JMP c
     * d:   <expr3>
     *       JMP a
     * c:   <loop>
     *       JMP d
     * b:    ...
     */
    function statement_for() {
        token.match(TYPE.SYMBOLS, '(') ? next() : throw_exception();
        expression(0); // expr1
        token.match(TYPE.SYMBOLS, ';') ? next() : throw_exception();
        var a = asm_code.length;
        expression(0); // expr2
        asm_code.push(CMD.JZ);
        var p1 = asm_code.length;
        asm_code.push(0);
        asm_code.push(CMD.JMP);
        var p2 = asm_code.length;
        asm_code.push(0);
        token.match(TYPE.SYMBOLS, ';') ? next() : throw_exception();
        var d = asm_code.length;
        expression(0); // expr3
        asm_code.push(CMD.JMP);
        asm_code.push(a);
        token.match(TYPE.SYMBOLS, ')') ? next() : throw_exception();
        var c = asm_code.length;
        statement(); // loop
        asm_code.push(CMD.JMP);
        asm_code.push(d);
        var b = asm_code.length;
        asm_code[p1] = b;
        asm_code[p2] = c;
    }

    /**
     * return的处理
     */
    function statement_return() {
        if(!token.match(TYPE.SYMBOLS, ';')) {
            expression(0);
        }
        token.match(TYPE.SYMBOLS, ';') ? next() : throw_exception();
        asm_code.push(CMD.LEV);
    }

    /**
     * 表达式汇编代码生成,采取递归下降方式
     * @param int level 表达式运算符优先级
     */
    function expression(level) {
        // 匹配第一个字符
        if(!token || token.match(TYPE.ILLEGAL)) {
            throw_exception();
        } else if(token.match(TYPE.NUMBER)) {
            asm_code.push(CMD.IMM);
            asm_code.push(token.value);
            expr_type = VAR_TYPE.INT;
            next();
        } else if(token.match(TYPE.STRING)) {
            var pos = asm_data.length;
            asm_data.push(token.value);
            asm_code.push(CMD.IMM);
            asm_code.push(pos);
            expr_type = VAR_TYPE.CHAR + VAR_TYPE.PTR;
            next();
        } else if(token.match(TYPE.SYMBOLS, 'sizeof')) {
            // js模拟的虚拟机中所有类型都只有一个单位
            next();
            token.match(TYPE.SYMBOLS, '(') ? next() : throw_exception();
            token.match(TYPE.NUMBER) || token.match(TYPE.STRING) ?
                next() : throw_exception();
            token.match(TYPE.SYMBOLS, ')') ? next() : throw_exception();
            asm_code.push(CMD.IMM);
            asm_code.push(1);
            expr_type = VAR_TYPE.INT;
        } else if(token.match(TYPE.VARIABLE)) {
            // 可能是 全局变量,局部变量,自定义函数,系统函数
            if(Object.keys(variable_list).indexOf(token.value) != -1) {
                // 全局变量
                asm_code.push(CMD.IMM);
                asm_code.push(variable_list[token.value].var_addr);
                expr_type = variable_list[token.value].var_type;
                asm_code.push(expr_type == VAR_TYPE.INT ? CMD.LI : CMD.LC);
                next();
            } else if(Object.keys(local_list).indexOf(token.value) != -1) {
                asm_code.push(CMD.LEA);
                asm_code.push(index_bp - local_list[token.value].var_addr);
                expr_type = local_list[token.value].var_type;
                asm_code.push(expr_type == VAR_TYPE.INT ? CMD.LI : CMD.LC);
                next();
            } else if(Object.keys(function_list).indexOf(token.value) != -1 ||
                      tokenizer.FUNCS.indexOf(token.value) != -1) {
                var func_name = token.value; // 获得函数名称
                next();
                // 匹配函数参数
                token.match(TYPE.SYMBOLS, '(') ? next() : throw_exception();
                var args = 0; 
                while(!token.match(TYPE.SYMBOLS, ')')) {
                    expression(0);
                    asm_code.push(CMD.PUSH);
                    args++;
                    if(token.match(TYPE.SYMBOLS, ',')) {
                        next();
                    }
                }
                next();
                if(Object.keys(function_list).indexOf(func_name) != -1) { // 自定义函数
                    asm_code.push(CMD.CALL);
                    asm_code.push(function_list[func_name].var_addr);
                    expr_type = function_list[func_name].var_type;
                } else {    // 系统函数
                    var sys_func = {
                        print: CMD.PRIT,
                        malloc: CMD.MALC,
                        exit: CMD.EXIT
                    }
                    asm_code.push(sys_func[func_name]);
                }
                // 调用结束弹出输入的参数
                asm_code.push(CMD.ADJ);
                asm_code.push(args);
            } else {
                throw_exception();
            }
        } else if(token.match(TYPE.NUMBER)) {
            // 立即数
            next();
            asm_code.push(CMD.IMM);
            asm_code.push(token.value);
            expr_type = VAR_TYPE.INT;
        } else if(token.match(TYPE.SYMBOLS, '(')) {
            // 左括号
            next();
            if(token.match(TYPE.SYMBOLS, 'int') ||
               token.match(TYPE.SYMBOLS, 'char')) {
                // 强制类型转换
                var cast_type = get_type();
                token.match(TYPE.SYMBOLS, ')') ? next() : throw_exception();
                expression(lv('++'));
            } else {
                // 普通的左括号
                expression(0);
                token.match(TYPE.SYMBOLS, ')') ? next() : throw_exception();
            }
        } else if(token.match(TYPE.SYMBOLS, '*')) {
            // 取值
            next();
            expression(lv('single'));
            if(expr_type >= VAR_TYPE.PTR) {
                expr_type -= VAR_TYPE.PTR;
            }
            asm_code.push(expr_type == VAR_TYPE.CHAR ? CMD.LC : CMD.LI);
        } else if(token.match(TYPE.SYMBOLS, '&')) {
            // 取地址
            next();
            expression(lv('single'));
            if([CMD.LI, CMD.LC].indexOf(asm_code[asm_code.length - 1]) != -1) {
                asm_code.pop();
            } else {
                throw_exception();
            }
            expr_type += VAR_TYPE.PTR;
        } else if(token.match(TYPE.SYMBOLS, '!')) {
            // 逻辑not: 判断是否为0
            next();
            expression(lv('single'));
            asm_code.push(CMD.PUSH);
            asm_code.push(CMD.IMM);
            asm_code.push(0);
            asm_code.push(CMD.EQ);
            expr_type = VAR_TYPE.INT;
        } else if(token.match(TYPE.SYMBOLS, '~')) {
            // bit not: 与0xFFFF做亦或
            next();
            expression(lv('single'));
            asm_code.push(CMD.PUSH);
            asm_code.push(CMD.IMM);
            asm_code.push(0xff);
            asm_code.push(CMD.XOR);
            expr_type = VAR_TYPE.INT;
        } else if(token.match(TYPE.SYMBOLS, '+')) {
            next();
            expression(0);
            expr_type = VAR_TYPE.INT;
        } else if(token.match(TYPE.SYMBOLS, '-')) {
            // * (-1)
            next();
            asm_code.push(CMD.IMM);
            asm_code.push(-1);
            asm_code.push(CMD.PUSH);
            expression(lv('single'));
            asm_code.push(CMD.MUL);
            expr_type = VAR_TYPE.INT;
        } else if(token.match(TYPE.SYMBOLS, '++')) {
            // ++在变量前面,加x=x+1并且返回x+1
            next();
            expression(lv('single'));
            if(asm_code[asm_code.length - 1] == CMD.LI) {
                asm_code[asm_code.length - 1] = CMD.PUSH;
                asm_code.push(CMD.LI);
            } else if(asm_code[asm_code.length - 1] == CMD.LC) {
                asm_code[asm_code.length - 1] = CMD.PUSH;
                asm_code.push(CMD.LC);
            } else {
                throw_exception();
            }
            asm_code.push(CMD.PUSH);
            asm_code.push(CMD.IMM);
            asm_code.push(1);
            asm_code.push(CMD.ADD);
            asm_code.push(expr_type == VAR_TYPE.CHAR ? CMD.SC : CMD.SI);
            expr_type = VAR_TYPE.INT;
        } else if(token.match(TYPE.SYMBOLS, '--')) {
            // --在变量前面
            next();
            expression(lv('single'));
            if(asm_code[asm_code.length - 1] == CMD.LI) {
                asm_code[asm_code.length - 1] = CMD.PUSH;
                asm_code.push(CMD.LI);
            } else if(asm_code[asm_code.length - 1] == CMD.LC) {
                asm_code[asm_code.length - 1] = CMD.PUSH;
                asm_code.push(CMD.LC);
            } else {
                throw_exception();
            }
            asm_code.push(CMD.PUSH);
            asm_code.push(CMD.IMM);
            asm_code.push(1);
            asm_code.push(CMD.SUB);
            asm_code.push(expr_type == VAR_TYPE.CHAR ? CMD.SC : CMD.SI);
            expr_type = VAR_TYPE.INT;
        } else {
            throw_exception();
        }

        var tmp_expr_type = expr_type;

        // 匹配后面的字符/运算符
        while(lv(token.value) >= level) {
            if(token.match(TYPE.SYMBOLS, '=')) {
                // 赋值
                next();
                if([CMD.LI, CMD.LC].indexOf(asm_code[asm_code.length - 1]) != -1) {
                    asm_code[asm_code.length - 1] = CMD.PUSH;
                } else {
                    throw_exception();
                }
                expression(lv('='));
                expr_type = tmp_expr_type;
                asm_code.push(expr_type == VAR_TYPE.CHAR ? CMD.SC : CMD.SI);
            } else if(token.match(TYPE.SYMBOLS, '?')) {
                // <condition> ? <true_statement> : <false_statement>
                next();
                asm_code.push(CMD.JZ);
                var a = asm_code.length;
                asm_code.push(0);
                expression(lv('='));
                asm_code.push(CMD.JMP);
                var b = asm_code.length;
                asm_code.push(0);
                match(TYPE.SYMBOLS, ':') ? next() : throw_exception();
                asm_code[a] = asm_code.length;
                expression(lv('?'));
                asm_code[b] = asm_code.length;
                expr_type = VAR_TYPE.INT;
            } else if(token.match(TYPE.SYMBOLS, '||')) {
                // 逻辑或,跳转实现
                next();
                asm_code.push(CMD.JNZ);
                var a = asm_code.length;
                asm_code.push(0);
                expression(lv('||'));
                asm_code[a] = asm_code.length;
                expr_type = VAR_TYPE.INT;
            } else if(token.match(TYPE.SYMBOLS, '&&')) {
                // 逻辑与,跳转实现
                next();
                asm_code.push(CMD.JZ);
                var a = asm_code.length;
                asm_code.push(0);
                expression(lv('&&'));
                asm_code[a] = asm_code.length;
                expr_type = VAR_TYPE.INT;
            } else if(token.match(TYPE.SYMBOLS, '|')) {
                next();
                asm_code.push(CMD.PUSH);
                expression(lv('|'));
                asm_code.push(CMD.OR);
                expr_type = VAR_TYPE.INT;
            } else if(token.match(TYPE.SYMBOLS, '&')) {
                next();
                asm_code.push(CMD.PUSH);
                expression(lv('&'));
                asm_code.push(CMD.AND);
                expr_type = VAR_TYPE.INT;
            } else if(token.match(TYPE.SYMBOLS, '^')) {
                next();
                asm_code.push(CMD.PUSH);
                expression(lv('^'));
                asm_code.push(CMD.XOR);
                expr_type = VAR_TYPE.INT;
            } else if(token.match(TYPE.SYMBOLS, '+')) {
                next();
                asm_code.push(CMD.PUSH);
                expression(lv('+'));
                asm_code.push(CMD.ADD);
                expr_type = VAR_TYPE.INT;
            } else if(token.match(TYPE.SYMBOLS, '-')) {
                next();
                asm_code.push(CMD.PUSH);
                expression(lv('-'));
                asm_code.push(CMD.SUB);
                expr_type = VAR_TYPE.INT;
            } else if(token.match(TYPE.SYMBOLS, '*')) {
                next();
                asm_code.push(CMD.PUSH);
                expression(lv('*'));
                asm_code.push(CMD.MUL);
                expr_type = VAR_TYPE.INT;
            } else if(token.match(TYPE.SYMBOLS, '/')) {
                next();
                asm_code.push(CMD.PUSH);
                expression(lv('/'));
                asm_code.push(CMD.DIV);
                expr_type = VAR_TYPE.INT;
            } else if(token.match(TYPE.SYMBOLS, '!=')) {
                next();
                asm_code.push(CMD.PUSH);
                expression(lv('!='));
                asm_code.push(CMD.NE);
                expr_type = VAR_TYPE.INT;
            } else if(token.match(TYPE.SYMBOLS, '==')) {
                next();
                asm_code.push(CMD.PUSH);
                expression(lv('=='));
                asm_code.push(CMD.EQ);
                expr_type = VAR_TYPE.INT;
            } else if(token.match(TYPE.SYMBOLS, '<=')) {
                next();
                asm_code.push(CMD.PUSH);
                expression(lv('<='));
                asm_code.push(CMD.LE);
                expr_type = VAR_TYPE.INT;
            } else if(token.match(TYPE.SYMBOLS, '>=')) {
                next();
                asm_code.push(CMD.PUSH);
                expression(lv('>='));
                asm_code.push(CMD.GE);
                expr_type = VAR_TYPE.INT;
            } else if(token.match(TYPE.SYMBOLS, '<')) {
                next();
                asm_code.push(CMD.PUSH);
                expression(lv('<'));
                asm_code.push(CMD.LT);
                expr_type = VAR_TYPE.INT;
            } else if(token.match(TYPE.SYMBOLS, '>')) {
                next();
                asm_code.push(CMD.PUSH);
                expression(lv('|'));
                asm_code.push(CMD.GT);
                expr_type = VAR_TYPE.INT;
            } else if(token.match(TYPE.SYMBOLS, '<<')) {
                next();
                asm_code.push(CMD.PUSH);
                expression(lv('|'));
                asm_code.push(CMD.SHL);
                expr_type = VAR_TYPE.INT;
            } else if(token.match(TYPE.SYMBOLS, '>>')) {
                next();
                asm_code.push(CMD.PUSH);
                expression(lv('|'));
                asm_code.push(CMD.SHR);
                expr_type = VAR_TYPE.INT;
            } else if(token.match(TYPE.SYMBOLS, '%')) {
                next();
                asm_code.push(CMD.PUSH);
                expression(lv('%'));
                asm_code.push(CMD.MOD);
                expr_type = VAR_TYPE.INT;
            } else if(token.match(TYPE.SYMBOLS, '++')) {
                next();
                // 后缀形式的自增,在前缀自增的基础上再返回x-1
                if(asm_code[asm_code.length - 1] == CMD.LI) {
                    asm_code[asm_code.length - 1] = CMD.PUSH;
                    asm_code.push(CMD.LI);
                } else if(asm_code[asm_code.length - 1] == CMD.LC) {
                    asm_code[asm_code.length - 1] = CMD.PUSH;
                    asm_code.push(CMD.LC);
                } else {
                    throw_exception();
                }
                asm_code.push(CMD.PUSH);
                asm_code.push(CMD.IMM);
                asm_code.push(1);
                asm_code.push(CMD.ADD);
                asm_code.push(expr_type == VAR_TYPE.CHAR ? CMD.SC : CMD.SI);
                asm_code.push(CMD.PUSH);
                asm_code.push(CMD.IMM);
                asm_code.push(1);
                asm_code.push(CMD.SUB);
                expr_type = VAR_TYPE.INT;
            } else if(token.match(TYPE.SYMBOLS, '--')) {
                next();
                // 后缀形式的自减
                if(asm_code[asm_code.length - 1] == CMD.LI) {
                    asm_code[asm_code.length - 1] = CMD.PUSH;
                    asm_code.push(CMD.LI);
                } else if(asm_code[asm_code.length - 1] == CMD.LC) {
                    asm_code[asm_code.length - 1] = CMD.PUSH;
                    asm_code.push(CMD.LC);
                } else {
                    throw_exception();
                }
                asm_code.push(CMD.PUSH);
                asm_code.push(CMD.IMM);
                asm_code.push(1);
                asm_code.push(CMD.SUB);
                asm_code.push(expr_type == VAR_TYPE.CHAR ? CMD.SC : CMD.SI);
                asm_code.push(CMD.PUSH);
                asm_code.push(CMD.IMM);
                asm_code.push(1);
                asm_code.push(CMD.ADD);
                expr_type = VAR_TYPE.INT;
            } else if(token.match(TYPE.SYMBOLS, '[')) {
                // 数组(指针)取值操作 a[10] <=> *(a+10)
                next();
                if(expr_type < VAR_TYPE.PTR) {
                    throw_exception();
                }
                asm_code.push(CMD.PUSH);
                expression(0);
                token.match(TYPE.SYMBOLS, ']') ? next() : throw_exception();
                asm_code.push(CMD.ADD);
                asm_code.push(expr_type % 2 == 0 ? CMD.LI : CMD.LC);
                expr_type -= tmp_expr_type - VAR_TYPE.PTR;
            } else if(token.match(TYPE.SYMBOLS, ';') || 
                      token.match(TYPE.SYMBOLS, ')') ||
                      token.match(TYPE.SYMBOLS, ']') ||
                      token.match(TYPE.SYMBOLS, ':') ||
                      token.match(TYPE.SYMBOLS, '?') ||
                      token.match(TYPE.SYMBOLS, ',')) {
                break;
            } else {
                throw_exception();
            }
        }
    }

    /**
     * 获得运算符的level
     * @param string operator 表达式运算符
     */
    function lv(operator) {
        if(operator == '=') {
            return 0; 
        } else if(operator == '?') {
            return 1;
        } else if(operator == '||') {
            return 2;
        } else if(operator == '&&') {
            return 3;
        } else if(operator == '|') {
            return 4;
        } else if(operator == '&') {
            return 5;
        } else if(['==', '!='].indexOf(operator) != -1) {
            return 6;
        } else if(['>', '>=', '<', '<='].indexOf(operator) != -1) {
            return 7;
        } else if(['+', '-'].indexOf(operator) != -1) {
            return 8;
        } else if(['*', '/', '%'].indexOf(operator) != -1) {
            return 9;
        } else if(operator == 'single') { // 单目运算符
            return 10;
        } else if(operator == '[') {
            return 11;
        }
        return 0;
    }

    /**
     * 全局定义式
     * global_decl ::= variable_decl | function_decl
     */
    function global_decl() {
        for(var index in token_list) {
            if(token_list[index].match(TYPE.SYMBOLS, '(')) {
                return function_decl();
            } else if(token_list[index].match(TYPE.SYMBOLS, ';')) {
                return variable_decl();
            }
        }
        console.log('error: illegal token! ' + JSON.stringify(token));
        throw_exception();
    }

    /**
     * 解析
     * @param Array t_list token list
     */
    function parse(t_list) {
        reset();
        token_list = t_list
        next();
        while(token) {
            global_decl(); 
        }
        // 添加main函数入口
        if(!function_list.hasOwnProperty('main')) {
            throw_exception('lack of main function');
        }
        var start_addr = asm_code.length;
        asm_code.push(CMD.CALL);
        asm_code.push(function_list['main'].var_addr);
        asm_code.push(CMD.PUSH);
        asm_code.push(CMD.EXIT);
        // 返回整个字节码core
        asm = {
            code: asm_code,
            data: asm_data,
            start_addr: start_addr
        };
        return asm;
    }

    /**
     * 重置parser各个变量
     */
    function reset() {
        token_list = [];
        variable_list = {};
        function_list = {};
        local_list = {};
        asm_code = [];
        asm_data = [];
        index_bp = 0;
    }

    /**
     * 抛出异常
     */
    function throw_exception(error) {
        var default_error = 'row: ' + token.row + 
                            ' col: ' + token.col + 
                            ' parse error ';
        throw error || default_error;
    }
    
    return {
        parse: parse
    };
});
