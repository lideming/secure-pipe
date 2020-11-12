
const letters = new Array(26).fill(0).map((x, i) => String.fromCharCode(65 + i)).join('')
    + new Array(26).fill(0).map((x, i) => String.fromCharCode(97 + i)).join('');

const digits = new Array(10).fill(0).map((x, i) => String.fromCharCode(48 + i)).join('');

const lettersAndDigits = letters + digits;

export function randomName(len: number) {
    return randomString(letters, 1) + randomString(lettersAndDigits, len - 1);
}

export function randomString(chars: string, len: number) {
    let str = '';
    while (len-- > 0) {
        str += chars[Math.floor(Math.random() * chars.length)];
    }
    return str;
}
