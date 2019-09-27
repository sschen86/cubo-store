import cuboStore from './cubo-store'

import fs from 'fs'

const packageStore = cuboStore({
    root: './cubo-packages',
    ext: '.pkg',
})

;(async function () {
    //  return
    const t1 = Date.now()

    await packageStore('vue').getItem('package.json')

    await packageStore('vue').setItem('package.json', JSON.stringify({
        name: 'vue',
        version: '1.0.0',
        // pp: Array(1024 * 4 * 1000).join('#'),
    }))

    await packageStore('vue').getItem('package.json')

    await packageStore('vue').setItem('a.js', JSON.stringify({
        name: 'a.js',
        content: Array(1024).join(Math.random()),
    }))
    await packageStore('vue').setItem('b.js', JSON.stringify({
        name: 'b.js',
        content: Array(1024 / 2).join(Math.random()),
    }))
    await packageStore('vue').setItem('c.js', JSON.stringify({
        name: 'c.js',
        content: 'ccc',
    }))

    // await packageStore('vue').setItem('c.js', JSON.stringify({ name: 'c.js', content: Array(1024 / 2).join(Math.random()) }))
    console.info(await packageStore('vue').getItem('c.js'))
    // console.info(await packageStore('vue').getItem('c.js'))

    await packageStore('vue').setItem('a.js', null)

    await packageStore('vue').setItem('c.js', JSON.stringify({
        name: 'c.js',
        content: 'ccc',
        pp: Array(1024 * 4).join('美国'),
    }))

    console.info(await packageStore('vue').getItem('c.js'))

    console.info(Date.now() - t1 + 'ms')
})()

// const fd = fs.openSync('./unit16.txt', 'a')

// const buff = Buffer.from(new Uint16Array())
// fs.writeSync(fd, buff, 0, buff.length)

// const buff = Buffer.alloc(16)
// buff.writeInt16BE(1, 0)
// buff.writeInt16BE(1, 2)
// buff.writeInt16BE(2, 4)
// buff.write(':')
// buff.writeUInt16LE(1)
// buff.write('6', 3)
// buff.writeInt8(0)

// console.info(buff)

/* 末尾添加海量数据
const fd = fs.openSync('./cubo-packages/vue.pkg', 'a')
for (let i = 0; i < 100; i++) {
    const value = Array(1024 * 4 * 1024).join(Math.random())
    const paddingBuffer = Buffer.from(value)
    fs.writeSync(fd, paddingBuffer, 0, paddingBuffer.length)
} */

/*
packageStore('vue').getItem('package.json').then((item) => {
    console.info(item)
})

packageStore('vue').setItem('package.json', JSON.stringify({
    name: 'vue',
    version: '1.0.0',
    // pp: Array(1024 * 80).join('#'),
})).then(() => {
    packageStore('vue').getItem('package.json').then(item => {
        console.info(item)
    })
})
*/
