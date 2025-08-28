import bcrypt from 'bcrypt'

export function capitalize(val) {
    var inp = String(val).toLowerCase().split(" ")
    var res
    for (var i = 0; i < inp.length; i++) {
        inp[i] = inp[i].charAt(0).toUpperCase() + inp[i].slice(1)
    }

    return inp.join(" ")
}

export function requestLog(req, res) {
    const fullUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    const method = req.method;
    const status = res.statusCode

    const str = method + " - " + fullUrl + " - " + status;

    console.log(str);
}