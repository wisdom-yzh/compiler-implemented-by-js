// 内存与cpu结构为vm.js的副本
var code, memory;
var status, tick, cycle, screen;           
var ax, ip, op, sp, bp;

// vm中各个函数的指针及常数拷贝副本
var malloc, free, step, CMD;

// TODO: 把vm.js中相关函数和这里的合并起来!

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
 * 内存释放
 * @param int addr 地址
 */
function free(addr) {
	delete memory[addr];
	return 1;
}

/**
 * 一个单步执行指令
 * @return void
 */
function step() {
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
		exit();
	}
}

/**
 * 重新实现的若干函数
 */
function print(str) {
	postMessage({
		cmd: 'print',
		data: str
	});
}

function exit() {
	print('exit(' + ax + ')\n');
	status = 0;
	close();
}

function terminate(core_dump) {
	status = 0;
	print('aborted!');
	if(core_dump) {
		postMessage({
			cmd: 'core_dump',
			data: {
				code: code,
				memory: memory,
				ip: ip,
				sp: sp,
				bp: bp,
				cycle: cycle
			}
		});
	}
}

function run(asm) {
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
	while(status) {
		step();
	}
}

// 接收消息
onmessage = function(event) {
	var data = event.data;
	switch(data.cmd) {
		case 'init':
			CMD = data.CMD;
			memory = new Array(data.ds_size + data.ss_size);
			break;
		case 'run':
			if(status) {
				postMessage('the machine is running now!');
				return;
			}
			run(data.asm);
			break;
		case 'terminate':
			if(!status) {
				postMessage('the machine is not running!');
				return;
			}
			terminate(data.core_dump);
			break;
	}
}
