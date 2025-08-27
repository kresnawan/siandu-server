import bcrypt from 'bcrypt'

function capitalize(val) {
    var inp = String(val).toLowerCase().split(" ")
    var res
    for (var i = 0; i < inp.length; i++) {
        inp[i] = inp[i].charAt(0).toUpperCase() + inp[i].slice(1)
    }

    return inp.join(" ")
}

export default capitalize