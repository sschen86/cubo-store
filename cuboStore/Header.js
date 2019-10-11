const MAGIC_STRING = 'CUBOSTORE'
const MAJOR_VERSION = 1
const MINOR_VERSION = 0
const BYTE_4K = 1024 * 4
const BYTE_RESERVED = 16 // 头信息填充字节
const BUFFER_HEADER = (() => {
    const header = Buffer.alloc(BYTE_4K)
    header.write(MAGIC_STRING)
    header.writeUInt8(MAJOR_VERSION, 9)
    header.writeUInt8(MINOR_VERSION, 10)
    header.writeUInt8(1, 11)
    return header
})()
const BYTE_HEADER = BUFFER_HEADER.length
const CHUNK_SIZE = 1

class Header {
    constructor (fd) {
        this.fd = fd
        this.byte = BYTE_HEADER
        this.chunkSize = CHUNK_SIZE
        this.chunkByte = this.chunkSize * BYTE_4K
        this.indexsTable = []
    }

    async init () {
        const headerBuffer = Buffer.alloc(BYTE_HEADER)
        await this.fd.read(headerBuffer, 0, BYTE_HEADER, 0)

        // 判断文件格式是否正确
        if (headerBuffer.toString('utf-8', 0, MAGIC_STRING.length) !== MAGIC_STRING) {
            throw Error('文件格式错误！')
        }

        // 判断文件版本是否支持当前版本程序
        const majorVersion = headerBuffer.readUInt8(9)
        const minorVersion = headerBuffer.readUInt8(10)
        if (majorVersion > MAJOR_VERSION || (majorVersion === MAJOR_VERSION && minorVersion > MINOR_VERSION)) {
            throw Error('文件版本过高，请升级程序')
        }

        // 读取块大小
        this.chunkSize = headerBuffer.readUInt8(11)
        this.chunkByte = this.chunkSize * BYTE_4K

        // 读取数据分区表索引
        let cursor = BYTE_RESERVED
        const indexsTable = this.indexsTable = []
        while (cursor < BYTE_HEADER) {
            const chunkIndex = headerBuffer.readUInt16LE(cursor)
            if (chunkIndex === 0) {
                break
            }
            cursor += 2
            indexsTable.push(chunkIndex)
        }
    }

    async update (indexsTable) {
        const headerBuffer = Buffer.from(BUFFER_HEADER)
        let cursor = BYTE_RESERVED
        for (let i = 0; i < indexsTable.length; i++) {
            headerBuffer.writeUInt16LE(indexsTable[i], cursor)
            cursor += 2
        }
        await this.fd.write(headerBuffer, 0, BYTE_HEADER, 0)
        this.indexsTable = indexsTable
    }
}

export default Header
