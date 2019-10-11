import fs from 'fs'
import path from 'path'
import Header from './Header'
import Chunks from './Chunks'

export default function cuboStore (option) {
    const cacheStores = {}
    const env = { root: option.root || DEFAULT_ROOT, ext: option.ext || DEFAULT_EXT }
    return (id) => cacheStores[id] || (cacheStores[id] = new Store(id, env))
}

const DEFAULT_ROOT = './cubo-stores'
const DEFAULT_EXT = '.pkg'
const STATE = { init: 0, loading: 1, compile: 2 }

const afs = fs.promises

class Store {
    constructor (id, env) {
        this.path = path.join(env.root, id) + env.ext
        this.fd = null
        this.layers = null
        this.header = null
        this.chunks = null
        this.openStoreWaits = []
        this.state = STATE.init
    }

    async getItem (layerId) {
        await openStore.call(this)
        return this.chunks.readLayer(this.layers[layerId])
    }

    async setItem (layerId, value) {
        await openStore.call(this)

        if (value == null) {
            if (layerId in this.layers) {
                await this.removeLayer(layerId)
            }
        } else {
            await this.setLayer(layerId, value)
        }
    }

    async setLayer (layerId, value) {
        // 写入数据
        const newLayerChunkIndexs = await this.chunks.write(Buffer.from(value))

        // 创建数据新索引
        const newLayers = { ...this.layers }
        newLayers[layerId] = newLayerChunkIndexs

        // 写入数据新索引
        const newIndexsTable = await this.chunks.writeIndexsTable(newLayers)

        // 更新索引表
        await this.header.update(newIndexsTable)

        // 更新数据索引
        this.layers = newLayers

        // 释放无用数据块
        await this.chunks.updateUsed(this.header.indexsTable, this.layers)
    }

    async removeLayer (layerId) {

    }
}

async function openStore () {
    if (this.fd) { // 文件已经打开，则直接返回
        return
    }

    if (this.state === STATE.loading) { // 文件打开中，则加入等待队列
        return new Promise((resolve) => {
            this.openStoreWaits.push(resolve)
        })
    }

    this.STATE = STATE.loading = true

    // 侦测是否创建文件
    try {
        await afs.access(this.path)
    } catch (err) {
        this.fd = await afs.open(this.path, 'a+')
    }

    this.fd = await afs.open(this.path, 'r+')
    this.header = new Header(this.fd)
    this.chunks = new Chunks(this.fd, this.header.chunkByte, this.header.byte)
    this.layers = {}

    // 仓库还未初始化
    const fileStat = await afs.stat(this.path)
    if (fileStat.size === 0) {
        return
    }

    await this.header.init() // 初始化头

    this.chunks.setByte(this.header.chunkByte) // 重新设置块大小

    this.layers = await this.chunks.readLayers(this.header.indexsTable) // 读取数据层索引

    await this.chunks.updateUsed(this.header.indexsTable, this.layers)

    // 消除队列
    const { openStoreWaits } = this
    for (let i = 0; i < openStoreWaits.length; i++) {
        openStoreWaits[i]()
    }
    openStoreWaits.length = 0
    this.state = STATE.compile
}
