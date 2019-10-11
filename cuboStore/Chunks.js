// 数据块操作类
class Chunks {
    constructor (fd, chunkByte, offsetByte) {
        this.fd = fd
        this.chunkByte = chunkByte
        this.offsetByte = offsetByte
        this.usedChunks = {}
    }

    setByte (chunkByte) {
        this.chunkByte = chunkByte
    }

    async write (buffer) {
        const { chunkByte, offsetByte } = this

        const chunkNum = Math.ceil(buffer.length / chunkByte)
        const bufferFully = Buffer.alloc(chunkNum * chunkByte)
        const chunkIndexs = this.applyFreedom(chunkNum)

        buffer.copy(bufferFully)

        for (let i = 0; i < chunkIndexs.length; i++) {
            await this.fd.write(bufferFully, i * chunkByte, chunkByte, offsetByte + chunkIndexs[i] * chunkByte)
        }
        return chunkIndexs
    }

    async read (chunkIndexs) {
        const { chunkByte, offsetByte } = this
        const buffer = Buffer.allocUnsafe(chunkIndexs.length * chunkByte)

        for (let i = 0; i < chunkIndexs.length; i++) {
            await this.fd.read(buffer, i * chunkByte, chunkByte, offsetByte + chunkIndexs[i] * chunkByte)
        }
        return buffer
    }

    applyFreedom (chunkNum) {
        const { usedChunks } = this
        const chunks = []
        let chunkIndex = 0
        while (true) {
            if (!(chunkIndex in usedChunks)) {
                usedChunks[chunkIndex] = true
                chunks.push(chunkIndex)
            }
            chunkIndex++
            if (chunks.length === chunkNum) {
                break
            }
        }
        return chunks
    }

    updateUsed (indexsTable, layers) {
        const chunkIndexs = indexsTable.concat(...Object.keys(layers).map(layerId => layers[layerId]))
        const usedChunks = this.usedChunks = {}
        for (let i = 0; i < chunkIndexs.length; i++) {
            usedChunks[chunkIndexs[i]] = true
        }
    }

    async readLayers (chunkIndexs) {
        const layers = {}
        const layersBuffer = await this.read(chunkIndexs)
        const layersBufferSize = layersBuffer.length

        // 解析layer索引信息
        let cursor = 0
        while (cursor < layersBufferSize) {
            // #layerId:chunkIndexsSize

            const token = layersBuffer.toString('utf-8', cursor++, cursor)
            if (token !== '#') {
                break
            }

            // 解析layerId
            let layerId = ''
            while (true) {
                const letter = layersBuffer.toString('utf-8', cursor++, cursor)
                if (letter === ':') {
                    break
                }
                layerId += letter
            }

            // 解析chunkIndexs
            const chunkIndexs = []
            const chunkIndexsSize = layersBuffer.readUInt16LE(cursor)
            cursor += 2
            for (let i = 0; i < chunkIndexsSize; i++) {
                chunkIndexs.push(layersBuffer.readUInt16LE(cursor))
                cursor += 2
            }
            layers[layerId] = chunkIndexs
        }
        return layers
    }

    async readLayer (chunkIndexs) {
        if (chunkIndexs == null || chunkIndexs.length === 0) {
            return null
        }
        const layerBuffer = await this.read(chunkIndexs)
        // eslint-disable-next-line no-control-regex
        return layerBuffer.toString().replace(/\x00/g, '')
    }

    async writeLayer (layerBuffer) {
        return this.write(layerBuffer)
    }

    async writeIndexsTable (layers) {
        const layersArray = []
        for (const key in layers) {
            // #layerId:chunkNum chunks
            layersArray.push('#' + key + ':', layers[key].length, ...layers[key])
        }
        return this.write(BufferFromArray(layersArray))
    }
}

export default Chunks

// 从数组中创建buffer，BufferFromArray(['abc', 12, 999, '666']) 其中数字会写入16位int类型
function BufferFromArray (array) {
    const buffers = []
    array.forEach(item => {
        const type = typeof item
        if (type === 'string') {
            buffers.push(Buffer.from(item))
        } else if (type === 'number') {
            const buffer = Buffer.allocUnsafe(2)
            buffer.writeUInt16LE(item)
            buffers.push(buffer)
        }
    })
    return Buffer.concat(buffers)
}
