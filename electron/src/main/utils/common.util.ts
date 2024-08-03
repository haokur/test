export const CommonUtil = {
  getRandomNum(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min)
  },
  getRandomStr(len) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'.split('')
    let KEY = ''
    const charsLength = chars.length
    for (let i = 0; i < len; i += 1) {
      KEY += chars[this.getRandomNum(0, charsLength)]
    }
    return KEY
  },
  generateRandomNumberString(digits) {
    if (digits <= 0) {
      throw new Error('Number of digits must be greater than zero.')
    }

    let randomNumberString = ''
    for (let i = 0; i < digits; i++) {
      randomNumberString += Math.floor(Math.random() * 10).toString()
    }
    return randomNumberString
  }
}
