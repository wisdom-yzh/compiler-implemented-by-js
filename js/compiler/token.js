/**
 * token.js
 * 词法分析
 */
define(function() {

    /**
     * token列表
     */
    var token_list = [];

    /**
     * 系统关键词数组
     */
    var KEYS = (
        // 关键词           KEYS.slice(0, KEY_SPLIT)
        'char else if int return sizeof while void for ' +
        // 支持的运算符     KEYS.slice(KEY_SPLIT)
        // 先长后短,这样匹配时先匹配长的
        '<<= >>= ++ -- || && == != <= >= << >> ' +
		'+= -= *= /= &= |= %= ' +
        '+ - | & ~ ! ^ ? : ; , * / % ( ) { } [ ] = > <'
    ).split(' ');

    const KEY_SPLIT = 9;

    /**
     * 系统自带函数
     */
    var FUNCS = (
        'print malloc exit'
    ).split(' ');

    /**
     * token的类型
     */
    const TYPE = {
        VARIABLE: 0,  // 变量
        NUMBER: 1,    // 数字
        STRING: 2,    // 字符串
        SYMBOLS: 3,   // 关键字
        ILLEGAL: 4,   // 非法字符
    };

    /**
     * struct Token
     * @param int type token的类型
     * @param mixed value token的值
     * @param int row 代码行号
     * @param int col 代码列号
     */
    function Token(type, value, row, col) {
        this.type = type;
        this.value = value;
        this.row = row;
        this.col = col;
    }

    /**
     * Token匹配
     * @param int type
     * @param mixed value
     * @return bool
     */
    Token.prototype.match = function(type, value) {
        if(type == TYPE.SYMBOLS) {
			if(Array.isArray(value)) {
				return value.indexOf(this.value) != -1;
			}
            return this.type == type && this.value == value;
        } else {
            return this.type == type;
        }
    }


    /**
     * 往token_list中添加新的token
     * @param int type
     * @param mixed value
     */
    function add_token(type, value, row, col) {
        token_list.push(new Token(type, value, row, col));
    }

    /**
     * 词法分析
     * @param string expr 源代码
     */
    function tokenizer(expr) {
        token_list = [];
        var length = expr.length,  // 输入长度
            pos = 0, current,      // 当前下标和对应字符
            line = 1, col = 0;     // 当前解析行和列

        while(true) {
            current = expr[pos++];
            col++;
            if(current == '\0' || pos >= length) {  // 结束符
                break;
            } else if(current == ' ') {             // 跳过空格
                continue;
            } else if(current == '\n') {            // \n换行
                line++;
                col = 0;
            } else if(current == '#') {             // 跳过宏定义
                while(expr[pos] != '\0' && expr[pos] != '\n') {
                    pos++;
                }
            } else if(current >= 'A' && current <= 'Z' ||
                      current >= 'a' && current <= 'z' ||
                      current == '_') {
                // 字母开头->判断变量/系统关键字
                var sub_expr = expr.substring(pos - 1), 
                    key_match = false;
                // 匹配系统关键字
                for(var index in KEYS.slice(0, KEY_SPLIT)) {
                    if(new RegExp('^' + KEYS[index] + '(?=[^A-Za-z0-9_])').test(sub_expr)) {
                        add_token(TYPE.SYMBOLS, KEYS[index], line, col);
                        pos += (KEYS[index].length - 1);
                        col += (KEYS[index].length - 1);
                        key_match = true;
                        break;
                    }
                }
                // 匹配系统函数
                if(!key_match) {
                    for(var index in FUNCS) {
                        if(new RegExp('^' + FUNCS[index] + '(?=[^A-Za-z0-9_])').test(sub_expr)) {
                            add_token(TYPE.VARIABLE, FUNCS[index], line, col);
                            pos += (FUNCS[index].length - 1);
                            col += (FUNCS[index].length - 1);
                            key_match = true;
                            break;
                        }
                    }
                }
                // 匹配变量名 ps:总能匹配到
                if(!key_match) {
                    var var_match = /^[_A-Za-z][A-Za-z0-9_]*/.exec(sub_expr);
                    add_token(TYPE.VARIABLE, var_match[0], line, col);
                    pos += (var_match[0].length - 1);
                    col += (var_match[0].length - 1);
                }
            } else if(current >= '0' && current <= '9') {
                // 匹配数字常量 ps:总能匹配到
                var sub_expr = expr.substring(pos - 1);
                var num_match = /^\d+/.exec(sub_expr);
                add_token(TYPE.NUMBER, parseInt(num_match[0]), line, col); 
                pos += (num_match[0].length - 1);
                col += (num_match[0].length - 1);
            } else if(current == '"') {
                // 匹配字符串常量
                var sub_expr = expr.substring(pos - 1);
                str_match = /"[^\n]*?[^\\]"/.exec(sub_expr);
                if(!str_match) {
                    add_token(TYPE.ILLEGAL, 'error string', line, col);
                }
                // 字符转义
                add_token(TYPE.STRING, str_match[0].slice(1, -1)
                    .replace('\\n', '\n')
                    .replace('\\t', '\t')
                    .replace('\\\\', '\\')
                    .replace('\\\'', '\'')
                    .replace('\\"', '"'), line, col
                );
                pos += (str_match[0].length - 1);
                col += (str_match[0].length - 1);
            } else {
                // 匹配各个运算符
                var sub_expr, symbol;
                for(var index in KEYS.slice(KEY_SPLIT)) {
                    symbol = KEYS[KEY_SPLIT + parseInt(index)];
                    sub_expr = expr.substr(pos - 1, symbol.length);
                    if(sub_expr == symbol) {
                        add_token(TYPE.SYMBOLS, symbol, line, col);
                        pos += (symbol.length - 1);
                        col += (symbol.length - 1);
                        break;
                    }
                }
            }
        }

        return token_list;
    }

    return {
        tokenizer: tokenizer,
        TYPE: TYPE,
        FUNCS: FUNCS,
        KEYS: KEYS
    }
});
