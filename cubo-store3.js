
import path from 'path'
import fs from 'fs'
const afs = fs.promises
const BLOCK_SIZE = 1024 / 2
const emptyBlockBuffer = Buffer.allocUnsafe(BLOCK_SIZE) // 创建空buffer提高效率
const STATE = { init: 0, loading: 1, compile: 2 }
const HEAD_FLAG = 'CUBO-STORE 1.0.0'

export default function cuboStore (option) {
    const cacheStores = {}

    const env = { root: option.root, ext: option.ext || '.pkg' }

    return (id) => cacheStores[id] || (cacheStores[id] = new Store(id, env))
}

class Store {
    constructor (id, env) {
        this.path = path.join(env.root, id) + env.ext
        this.waits = []
        this.fd = null
        this.layerIndexs = null
        this.state = STATE.init

        // this.isOpen = false
        // this.layerIndexs = null
        // this.state = STATE.init
        // this.waits = []
        // console.info(this.path)
    }

    async getItem (key) {
        if (await this.openStore()) {
            return this.getLayerContent(key)
        }

        return null
    }

    async setItem (key, value) {
        await this.openStore(true)
        if (value == null) { // 移除数据
            await this.removeLayerContent(key)
        } else {
            await this.setLayerContent(key, value)
        }
    }

    async openStore (fource) {
        // 文件已解析
        if (this.fd) {
            return true
        }

        if (this.state === STATE.loading) {
            return new Promise((resolve) => {
                this.waits.push(resolve)
            })
        }

        if (!fource) { // 非写模式，则文件不存在则返回false
            try {
                await afs.access(this.path)
            } catch (err) {
                this.resolveWaits(false)
                return false
            }
        }

        this.state = STATE.loading

        try {
            await afs.access(this.path)
        } catch (err) {
            this.fd = await afs.open(this.path, 'a+')
        }

        this.fd = await afs.open(this.path, 'r+')
        await this.parseHead()
        this.state = STATE.compile
        this.resolveWaits(true)

        return true
    }

    resolveWaits (isOpen) {
        const { waits } = this
        const waitsLength = waits.length
        if (waitsLength === 0) {
            return
        }

        for (let i = 0; i < waitsLength; i++) {
            waits[i](isOpen)
        }

        // console.info('resolveWaits')
    }

    async parseHead () {
        const headLayerBuffer = emptyBlockBuffer.fill()
        await this.fd.read(headLayerBuffer, 0, BLOCK_SIZE, 0)

        if (headLayerBuffer[0] === 0x0) { // 文件刚初始化
            this.layerIndexs = {}
            return
        }

        const headLayerString = headLayerBuffer.toString().replace(/\0/g, '')
        const heads = headLayerString.split('\n')
        const headFlagString = heads[0]
        // console.info(heads[1])
        const layerIndexs = heads[1] ? JSON.parse(heads[1]) : {}

        /*
         // headFormater: CUBO-STORE 1.0.0 0x0a layer1:1,2,3,4; layer2:5,6; layer3:7,8 0x00

        const heads = headLayerString.split('\n')
        const headFlag = heads[0]
        const layerIndexs = heads[1].split(';').reduce((results, info) => {
            const [layerName, layerBlocksString] = info.split(':')
            const layerBlocks = layerBlocksString.split(',')
            return results[layerName] = { blocks: layerBlocks }
        }, {})

        this.headFlag = headFlag
        this.layerIndexs = layerIndexs
        */

        this.layerIndexs = layerIndexs

        //  console.info({ headLayerBuffer, layerIndexs })

        // console.info('paseHead')
    }

    async getLayerContent (key) {
        const layerIndex = this.layerIndexs[key]
        if (!layerIndex) {
            return null
        }

        const blocks = layerIndex

        const valueBuffer = Buffer.alloc(blocks.length * BLOCK_SIZE)
        for (let i = 0; i < blocks.length; i++) {
            const startIndex = blocks[i]
            await this.fd.read(valueBuffer, i * BLOCK_SIZE, BLOCK_SIZE, startIndex * BLOCK_SIZE)
        }

        return valueBuffer.toString()
    }

    async setLayerContent (key, value) {
        const valueBuffer = Buffer.from(value)
        const valueBlockCount = Math.ceil(valueBuffer.length / BLOCK_SIZE)

        const freedomBlocks = this.getFreedomBlocks(key, valueBlockCount)

        const fullValueBuffer = Buffer.alloc(valueBlockCount * BLOCK_SIZE)
        valueBuffer.copy(fullValueBuffer)

        // console.info({ freedomBlocks, fullValueBuffer: fullValueBuffer.toString() })
        // return

        await this.updateLayerIndexs(key, freedomBlocks) // 先更新索引

        if (blocksIsSerial()) {
            // 一次性写入
            // console.info('setLayerContent.once')
            const startIndex = freedomBlocks[0]

            await this.fd.write(fullValueBuffer, 0, fullValueBuffer.length, startIndex * BLOCK_SIZE)
        } else {
            // 分区块写入
            // console.info('setLayerContent.mutiple')
            for (let i = 0; i < freedomBlocks.length; i++) {
                await this.fd.write(fullValueBuffer, i * BLOCK_SIZE, BLOCK_SIZE, freedomBlocks[i] * BLOCK_SIZE)
            }
        }

        // console.info('setLayerContent', { value, key, layerIndexs, valueBlockCount })

        function blocksIsSerial () { // 连续的空间，则使用一次性写入
            if (freedomBlocks.length === 1) {
                return true
            }

            for (let i = 0; i < freedomBlocks.length - 1; i++) {
                if (freedomBlocks[i + 1] - freedomBlocks[i] !== 1) { // 后面的块和前面的不是连续的
                    return false
                }
            }
            return true
        }
    }

    getFreedomBlocks (selfKey, needCount) {
        const { layerIndexs } = this
        const selfBlocks = layerIndexs[selfKey] || []

        if (selfBlocks.length >= needCount) {
            return selfBlocks.slice(0, needCount)
        }

        const notFreedomBlocks = []
        for (const key in layerIndexs) {
            if (key === selfKey) {
                continue
            }
            notFreedomBlocks.push(...layerIndexs[key])
        }
        notFreedomBlocks.sort()
        const lastIndex = notFreedomBlocks[notFreedomBlocks.length - 1] || 0
        const freedomBlocks = []
        for (let i = 1; i < lastIndex; i++) {
            if (!notFreedomBlocks.includes(i)) {
                freedomBlocks.push(i)
                if (freedomBlocks.length === needCount) {
                    break
                }
            }
        }

        freedomBlocks.push(...getFreedomBlocksFromTail(lastIndex, needCount - freedomBlocks.length)) // 独立空间不够的，从尾部拓展

        return freedomBlocks

        function getFreedomBlocksFromTail (tailIndex, needCount) {
            if (needCount === 0) {
                return []
            }
            const freedomBlocks = []
            for (let i = 1; i <= needCount; i++) {
                freedomBlocks.push(tailIndex + i)
            }
            return freedomBlocks
        }
    }

    async removeLayerContent (key) {
        delete this.layerIndexs[key]
        await this.syncLayerIndexs()
    }

    async updateLayerIndexs (key, newBlocks) {
        // 更新索引
        this.layerIndexs[key] = newBlocks
        await this.syncLayerIndexs()
    }

    async syncLayerIndexs () {
        emptyBlockBuffer.fill()
        Buffer.from([HEAD_FLAG, '\n', JSON.stringify(this.layerIndexs)].join('')).copy(emptyBlockBuffer)
        await this.fd.write(emptyBlockBuffer, 0, emptyBlockBuffer.length, 0)
    }
}
