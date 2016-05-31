a simple c-style compiler implemented by javascript
===================================================

### a simple sample

```c
int printPrimer(int n) {
    int i, j, max, is_prime = 1, qqq;
    int total_num = 0;
    if(n <= 1) {
        return 0;
    }
    for(i = 2; i <= n; i++) {
        is_prime = 1;
        max = i >> 1;
        for(j = 2; j <= max && is_prime; j++) {
             if(i % j == 0) {
                is_prime = 0;
             }
        }
        if(is_prime) {
            print(i);
            total_num++;
        }
    }
    return total_num;
}

int main() {
    return printPrimer(100);
}
