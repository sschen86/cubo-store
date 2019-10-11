import cuboStore from './cuboStore'

import fs from 'fs'

const packageStore = cuboStore({
    root: './cubo-packages',
    ext: '.pkg',
})

;(async function () {
    const t1 = Date.now()

    console.info(await packageStore('vue').getItem('package.json'))

    await packageStore('vue').setItem('package.json', JSON.stringify({
        name: 'vue',
        version: '1.0.0',
        // pp: Array(1024 * 4 * 10).join('#'),
    }))
    //  await packageStore('vue').setItem('index.js', 'export default = {a:22}')
    // await packageStore('vue').setItem('index.js', 'export default = {a:2233232}')
    // await packageStore('vue').setItem('index2222222222222222222222.js', 'export default = {a:2233232}')
    const content = Array(1024 * 4 * 1000 * 1).join('ABCDEFG')
    const t2 = Date.now()
    const value = await packageStore('vue').setItem('bigfile.js', content)
    // console.info('length', value.length)
    const t3 = Date.now()
    console.info(content.length / 1024 / 1024)

    console.info(t3 - t2)

    for (let i = 0; i < 100; i++) {
        const fileId = `${i}${i}${i}${i}${i}${i}${i}${i}${i}${i}.js`
        const fileContent = Array(1000).join(fileId)
        // await packageStore('vue').setItem(fileId, fileContent)

        //   console.info('###value###', await packageStore('vue').getItem(fileId))
    }

    for (let i = 0; i < 100; i++) {
        //  await packageStore('vue').setItem(`${i}.js`, '' + i)

        // console.info(await packageStore('vue').getItem(`${i}.js`))

        // const value = await packageStore('vue').getItem('file.' + Array(1000).join('a') + i + 'js', `${i}`)
        //  console.info('###value###', value)
    }

    await packageStore('vue').setItem('2.js', '888888888')
    console.info(await packageStore('vue').getItem('2.js'))
    return
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

// const buff = Buffer.alloc(16)
// buff.writeInt16LE(43, 0)
// buff.writeInt16LE(44, 2)

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
