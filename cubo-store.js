import fs from 'fs'
import path from 'path'

const afs = fs.promises

const MAGIC_STRING = 'CUBOSTORE'
const VERSION = '1.0.0'
const BYTE_4K = 1024 * 4
const CHUNK_SIZE = BYTE_4K
const BUFFER_4K = Buffer.allocUnsafe(BYTE_4K)
const DEFAULT_ROOT = './cubo-stores'
const DEFAULT_EXT = '.pkg'
const STATE = { init: 0, loading: 1, compile: 2 }

export default function cuboStore (option) {
    const cacheStores = {}
    const env = { root: option.root || DEFAULT_ROOT, ext: option.ext || DEFAULT_EXT }
    return (id) => cacheStores[id] || (cacheStores[id] = new Store(id, env))
}

class Store {
    constructor (id, env) {
        this.path = path.join(env.root, id) + env.ext
        this.openStoreWaits = []
        this.fd = null
        this.indexIndexs = null
        this.layerMetas = null
        this.state = STATE.init
    }

    async getItem (key) {
        await this.openStore()
        return this.getLayer(key)
    }

    async setItem (key, value) {
        await this.openStore()
        if (value == null) { // 移除数据
            await this.removeLayer(key)
        } else {
            await this.setLayer(key, value)
        }
    }

    async openStore () {
        if (this.fd) {
            return
        }

        if (this.state === STATE.loading) {
            return new Promise((resolve) => {
                this.openStoreWaits.push(resolve)
            })
        }

        this.STATE = STATE.loading = true

        try {
            await afs.access(this.path)
        } catch (err) {
            this.fd = await afs.open(this.path, 'a+')
        }

        this.fd = await afs.open(this.path, 'r+')

        await parseStore.call(this)

        this.state = STATE.compile
        this.resolveOpenStore()

        async function parseStore () {
            const fileStat = afs.stat(this.path)

            if (fileStat.size === 0) {
                this.chunkIndexs = {}
                return
            }

            BUFFER_4K.fill()
            await this.fd.read(BUFFER_4K, 0, BYTE_4K, 0)
            
            if(BUFFER_4K[0] !== 0x43 || BUFFER_4K[1] !== 0x55 || BUFFER_4K[2] !== 0x42 || BUFFER_4K[3] !== 0x4f){
                throw Error('文件格式错误！')
            }

            const majorVersion = BUFFER_4K.readUInt8(4)
            const minorVersion = BUFFER_4K.readUInt8(5)




            //BUFFER_4K[0]
                // 4355424f

        }
    }

    resolveOpenStore () {
        const { openStoreWaits } = this
        const waitsLength = openStoreWaits.length
        if (waitsLength === 0) {
            return
        }

        for (let i = 0; i < waitsLength; i++) {
            openStoreWaits[i]()
        }
    }

    getLayer (key) {
        const layerMeta = this.layerMetas[key]
        if (!layerMeta) {
            return null
        }

        const {indexs, chunkCount} = layerMeta
        const valueBuffer = Buffer.alloc(CHUNK_SIZE * chunkCount)
        for(let i = 0 ; i < indexs.length; i++){
            const { startIndex, chunkCount} = indexs[i]
            await this.fd.read(valueBuffer, startIndex * CHUNK_SIZE, CHUNK_SIZE, (startIndex + chunkCount) * CHUNK_SIZE )
        }



        [{startIndex,chunkCount,}, {}]

        0x01 0x00 [ startIndex, chunkCount ] []

        layerChunks.

        const valueBuffer = Buffer.alloc(layerChunks.length)



        const valueBuffer = Buffer.alloc(blocks.length * BLOCK_SIZE)
        for (let i = 0; i < blocks.length; i++) {
            const startIndex = blocks[i]
            await this.fd.read(valueBuffer, i * BLOCK_SIZE, BLOCK_SIZE, startIndex * BLOCK_SIZE)
        }

        return valueBuffer.toString()
    }
}
