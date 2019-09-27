
// import stream from 'stream'
import fs from 'fs'
// import util from 'util'

// const outFile = fs.createWriteStream('./a.txt', { start: 0 })

// outFile.write('CUBO-PACKAGE 1.0.0\n')
// outFile.write('100,layer1:80,layer2:60\n')
// outFile.end()

// const fd = fs.openSync('./test.txt', 'rs+')

// fs.writeSync(fd, Buffer.from('000'), 0, 3, 1)

class Package {
    constructor (id) {
        this._path = './cubo-packages/' + id + '.pkg'
        this._fileHandle = null
        this._indexs = null
    }

    async getItem (key) {
        if (!this._initIndexs()) {
            return null
        }

        const layer = this._indexs[key]
        if (layer) {
            return util.promisify(fs.read)(this._theFileHandle(), Buffer.allocUnsafe(layer.size), 0, layer.size, layer.startIndex)
        }

        return null
    }

    setItem (key, value) {
        if (!this._initIndexs()) {
            this._create()
        }

        const buffer = Buffer.from(value)
    }

    _theFileHandle () {
        return this._fileHandle = this._fileHandle || fs.open(this._path, 'w+')
    }

    _initIndexs () {
        if (this._indexs) {
            return this._indexs
        }

        if (!fs.existsSync(this._path)) {
            return null
        }

        this._indexs = {}
        const readable = fs.createReadStream(this._path)

        const fileHeadBytes = []
        const layerIndexsBytes = []

        let byte
        while (true) {
            byte = readable.read()
            if (byte === null || byte === 0x0a) {
                break
            }
            fileHeadBytes.push(byte)
        }

        if (fileHeadBytes.join('') !== 'CUBO-PACKAGE 1.0.0') {
            throw Error('file is not cubo package')
        }

        while (true) {
            byte = readable.read()
            if (byte === null || byte === 0x0a) {
                break
            }
            layerIndexsBytes.push(byte)
        }

        let nowStartIndex = this._metaSize = fileHeadBytes.length + 1 + layerIndexsBytes.length + 1
        return this._indexs = layerIndexsBytes.join('').split(',').reduce((indexs, text) => {
            const [key, size] = text.split(':')
            indexs[key] = {
                startIndex: nowStartIndex,
                size,
            }
            nowStartIndex += size
        }, { })
    }

    _create () {
        const fileHeadBytes = ['CUBO-PACKAGE 1.0.0']
        const layerIndexsBytes = []
        this._indexs = {}
        this._metaSize = fileHeadBytes.length + 1 + layerIndexsBytes.length + 1
    }
}

// const vuePackage = new Package('vue')

// const fileIndex = vuePackage.getItem('index')

// vuePackage.setItem('index', 'export default {}')

// console.info('#' + fileIndex + '#')
