
import ofs from 'fs'

const fs = ofs.promises
const dbpath = './cubo-stores'
const HEAD_FLAG = 'CUBO-STORE 1.0.0'
const BLOCK_SIZE = 1024 * 4
const EMPTY_HEAD_BUFFER = Buffer.allocUnsafe(BLOCK_SIZE)

// CUBO-STORE 0x0a layer1:1,2,3,4; layer2:5,6; layer3:7,8 0x00

function store (id) {
    return new Store(id)
}

export default store

class Store {
    constructor (id) {
        this.path = dbpath + '/' + id + '.sto'
        this.indexs = null
        this.hasInit = false
        this.fd = null
    }

    async getItem (id) {
        await this.init()

        if (this.exists && this.hasLayer(id)) {
            return 'xxx'
        }

        return null
    }

    async setItem (id, value) {
        await this.init()

        if (!this.exists) {
            await this.initStore()
        }

        const layer = this.getLayer()
        const valueBuffer = Buffer.from(value)
        const needBlockNum = Math.ceil(valueBuffer.length / BLOCK_SIZE)
        const newBlocks = this.getFreedomBlocks(layer, needBlockNum)
        const willBuffer = Buffer.alloc(needBlockNum * BLOCK_SIZE)

        valueBuffer.copy(willBuffer)

        await fs.write(this.fd, willBuffer, newBlocks[0] * BLOCK_SIZE)
        await fs.write(this.fd, this.headBuffer(), 0)
    }

    async init () {
        if (this.hasInit) {
            return
        }

        this.hasInit = true
        try {
            await fs.access(this.path)
            this.exists = true
        } catch (err) {
            this.exists = false
        }

        if (this.exists) {
            await this.parse()
        }
    }

    async initStore () {
        this.indexs = {}
        this.fd = await fs.open(this.path, 'a+')
    }

    async parse () {
        const readable = fs.createReadStream(this.path)
        const fileHeadByte = readable.read(BLOCK_SIZE)
    }

    async headBuffer () {
        const headBuffer = EMPTY_HEAD_BUFFER.fill()
        const headString = [HEAD_FLAG + '\n']

        return headBuffer
    }

    getFreedomBlocks (layer, needBlockNum) {
        const oldFreedomBlocks = []

        if (oldFreedomBlocks.length >= needBlockNum) { // 原有的自由空间足够存放当前数据，则使用原有空间
            return oldFreedomBlocks.slice(0, needBlockNum)
        }

        // 空间不足，则从末尾申请新的空间
        const lastFreedomBlockIndex = 0
        const newFreedomBlocks = []
        for (let i = lastFreedomBlockIndex; i < needBlockNum; i++) {
            newFreedomBlocks.push(i)
        }
        return newFreedomBlocks
    }
}

// store('vue').getItem('package.json')
// store('vue').setItem('package.json', 'code')
