const adminService = require('../../services/admin.service');

function safeEval(formula) {
    if (typeof formula !== 'string') {
        throw new Error("Invalid formula type");
    }

    if (!/^[0-9.+\-*/()\s]+$/.test(formula)) {
        throw new Error("Invalid characters in formula");
    }

    const tokens = [];
    const tokenRegex = /\d+(?:\.\d+)?|[+\-*/()]/g;
    let match;
    let lastIndex = 0;
    while ((match = tokenRegex.exec(formula)) !== null) {
        const skipped = formula.slice(lastIndex, match.index);
        if (/\S/.test(skipped)) {
            throw new Error("Invalid token in formula");
        }
        tokens.push(match[0]);
        lastIndex = tokenRegex.lastIndex;
    }
    const remaining = formula.slice(lastIndex);
    if (/\S/.test(remaining)) {
        throw new Error("Invalid token in formula");
    }

    let index = 0;

    function peek() {
        return index < tokens.length ? tokens[index] : null;
    }

    function consume(expected) {
        if (peek() === expected) {
            index++;
            return true;
        }
        return false;
    }

    function parseExpression() {
        let result = parseTerm();
        while (true) {
            if (consume('+')) {
                result += parseTerm();
            } else if (consume('-')) {
                result -= parseTerm();
            } else {
                break;
            }
        }
        return result;
    }

    function parseTerm() {
        let result = parseFactor();
        while (true) {
            if (consume('*')) {
                result *= parseFactor();
            } else if (consume('/')) {
                const nextFactor = parseFactor();
                if (nextFactor === 0) {
                    throw new Error("Division by zero");
                }
                result /= nextFactor;
            } else {
                break;
            }
        }
        return result;
    }

    function parseFactor() {
        if (consume('(')) {
            const result = parseExpression();
            if (!consume(')')) {
                throw new Error("Missing closing parenthesis");
            }
            return result;
        }

        if (consume('-')) {
            return -parseFactor();
        }
        if (consume('+')) {
            return parseFactor();
        }

        const token = peek();
        if (token !== null && /^\d+(?:\.\d+)?$/.test(token)) {
            index++;
            return parseFloat(token);
        }

        throw new Error("Unexpected token: " + (token || "EOF"));
    }

    const value = parseExpression();
    if (index < tokens.length) {
        throw new Error("Unexpected extra tokens at end of formula");
    }

    if (isNaN(value) || !isFinite(value)) {
        throw new Error("Invalid numeric result");
    }

    return value;
}

exports.checkShippingStatus = (req, res) => {
    adminService.pingProvider(req.body.providerIP, req.body.options, out => res.send(out));
};

exports.previewDynamicPricing = (req, res) => {
    try {
        res.json({ price: safeEval(req.body.formula) });
    } catch (e) {
        res.status(400).send("Evaluation Failed");
    }
};
