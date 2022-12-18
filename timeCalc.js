const tokenType = {
    paren: 'paren',
    sumsubstr: 'sumsubstr',
    multdiv: 'multdiv',
    equals: 'equals',
    time: 'time',
    scalar: 'scalar'
};

const nodeType = {
    equals: 'equals',
    sum: 'sum',
    substract: 'substract',
    mult: 'mult',
    div: 'div',
    time: 'time',
    scalar: 'scalar'
}

const evaluateType = {
    time: 'time',
    scalar: 'scalar',
    boolean: 'boolean'
};

function tokenize(input) {
    let current = 0;

    let tokens = [];

    while(current < input.length) {
        let char = input[current];

        if(char == '(' || char == ')') {
            tokens.push({
                type: tokenType.paren,
                value: char
            });

            current++;
            continue;
        }

        if(char == '+' || char == '-') {
            tokens.push({
                type: tokenType.sumsubstr,
                value: char
            });

            current++;
            continue;
        }

        if(char == '*' || char == '/') {
            tokens.push({
                type: tokenType.multdiv,
                value: char
            });

            current++;
            continue;
        }

        if(char == '=') {
            tokens.push({
                type: tokenType.equals,
                value: char
            });

            current++;
            continue;
        }

        if(/\s/.test(char)) {
            current++;
            continue;
        }

        if(/[0-9]/.test(char)) { // time or scalar
            let value = '';

            while(/[0-9]/.test(char)) {
                value += char;
                current++;
                char = input[current];
            }

            if(char == ":") { //time
                current++;
                char = input[current];
                let hours = value;
                let minutes = '';
                while(/[0-9]/.test(char)) {
                    minutes += char;
                    current++;
                    char = input[current];
                }

                if(/^[0-9]{1,2}:[0-9]{2}$/.test(`${hours}:${minutes}`)) {
                    tokens.push({
                        type: tokenType.time,
                        value: { hours: parseInt(hours), minutes: parseInt(minutes) }
                    });
        
                    continue;
                }
                else {
                    throw new Error(`Expected time value (hh:mm) but got: ${hours}:${minutes}`)
                }
            }
            else { // scalar
                tokens.push({
                    type: tokenType.scalar,
                    value: parseInt(value)
                });
    
                continue;
            }
        }

        throw new Error(`Unexpected character: '${char}' at pos ${current}`);
    }

    return tokens;
}

/*
    body        ::= expression | equals
    equals      ::= expression = expression
    expression  ::= sum_expression | substr_expression | prio_expression | time
    sum_expression ::=  prio_expression + prio_expression
    substr_expression   ::= prio_expression - prio_expression
    prio_expression ::= div_expression | mult_expression
    div_expression ::= time / scalar | (expression)
    mult_expression ::= time * scalar | scalar * time | (expression)
*/

function parse(tokens) {
    let current = -1;
    let token = null;

    function nextToken() {
        current++;
        token = tokens[current];
    }

    function error(msg) {
        throw new Error(msg);
    }

    function accept(type, value = null) {
        if(token == null) {
            return false;
        }
        if (type == token.type && (value == null || token.value == value)) {
            nextToken();
            return true;
        }
        return false;
    }

    function expect(type, value = null) {
        if(accept(type, value)) {
            return true;
        }
        let found = token == null ? "EOF" : `${token.type}${token.value}`;
        error(`expect: expected '${type}${value == null ? "" : " " + value}', but found '${found}'`);
    }

    function scalar() {
        if(accept("scalar")) {
            return token.value;
        }
    }

    function time() {
        let value = token.value;
        if(accept(tokenType.paren, '(')) {
            let result = expression();
            expect(tokenType.paren, ')');
            return result;
        }
        else if(accept(tokenType.scalar)) {
            return {
                type: nodeType.scalar,
                value
            };
        }
        expect(tokenType.time);
        return {
            type: nodeType.time,
            value
        };
    }

    function prioExpression() {
        let left = time();
        if(accept(tokenType.multdiv, '*')) {
            let right = prioExpression();
            return {
                type: nodeType.mult,
                left,
                right
            };
        }
        else if(accept(tokenType.multdiv, '/')) {
            let right = prioExpression();
            return {
                type: nodeType.div,
                left,
                right
            };
        }
        else {
            return left;
        }
    }

    function expression() {
        let left = prioExpression();
        if(accept(tokenType.sumsubstr, '+')) {
            let right = expression();
            return {
                type: nodeType.sum,
                left,
                right
            };
        }
        else if(accept(tokenType.sumsubstr, '-')) {
            let right = expression();
            return {
                type: nodeType.substract,
                left,
                right
            };
        }
        else {
            return left;
        }
    }

    function body() {
        let expr = expression();
        if(accept(tokenType.equals)) {
            let rexpr = expression();
            expr = {
                type: nodeType.equals,
                left: expr,
                right: rexpr
            };
        }
        return expr;
    }

    nextToken();
    return body();
}



function evaluate(tree) {
    function time(value) {
        return { type: evaluateType.time, value };
    }
    
    function scalar(value) {
        return { type: evaluateType.scalar, value };
    }
    
    function boolean(value) {
        return { type: evaluateType.boolean, value };
    }

    let left, right, result;

    switch(tree.type) {
        case nodeType.time:
            return time(tree.value.hours * 60 + tree.value.minutes);
        case nodeType.scalar:
            return scalar(tree.value);
        case nodeType.div:
            left = evaluate(tree.left);
            right = evaluate(tree.right);

            if(right.type != evaluateType.scalar) {
                throw new Error("Can only divide by scalar");
            }

            result = left.value / right.value;
            return left.type == evaluateType.time ? time(result) : scalar(result);
        case nodeType.mult: 
            left = evaluate(tree.left);
            right = evaluate(tree.right);

            if(right.type == evaluateType.time && left.type == evaluateType.time) {
                throw new Error("Cannot multiply time with time");
            }

            result = left.value * right.value;
            return left.type == evaluateType.scalar && right.type == evaluateType.scalar ? scalar(result) : time(result);
        case nodeType.sum: 
            left = evaluate(tree.left);
            right = evaluate(tree.right);

            if(left.type != right.type) {
                throw new Error("Cannot sum time and scalar");
            }

            result = left.value + right.value;
            return left.type == evaluateType.scalar ? scalar(result) : time(result);
        case nodeType.substract: 
            left = evaluate(tree.left);
            right = evaluate(tree.right);

            if(left.type != right.type) {
                throw new Error("Cannot subtract time and scalar");
            }

            result = left.value - right.value;
            return left.type == evaluateType.scalar ? scalar(result) : time(result);
        case nodeType.equals:
            left = evaluate(tree.left);
            right = evaluate(tree.right);

            if(left.type != right.type) {
                throw new Error("Cannot compare time with scalar");
            }

            result = left.value == right.value;
            return boolean(result);
        default: 
            throw new Error(`Unknown node type: ${tree.type}`);
    }

}

function toHumanReadable(result) {
    function pad(value, nrOfDigits) {
        let result = ''
        for(let i = 1; i<nrOfDigits; i++) {
            if(value < Math.pow(10, i)) {
                result += '0';
            }
        }
        result += value;
        return result;
    }

    switch(result.type) {
        case evaluateType.time:
            return `${Math.floor(result.value/60)}:${pad(Math.round(result.value%60), 2)}`;
        case evaluateType.scalar:
            return result.value;
        case evaluateType.boolean:
            return result.value ? 'Correct!' : 'Incorrect!';
        default:
            throw new Error(`Unknown evaluate type: ${result.type}`);
    }
}

exports.parse = function(text) {
    let tokens = tokenize(text);
    if(tokens.length == 0) {
        throw new Error("No expression to parse!");
    }
    let tree = parse(tokens);
    let result = evaluate(tree);
    return result;    
}

exports.toHumanReadable = function(result) {
    return toHumanReadable(result);
}