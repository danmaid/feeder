require('date-utils')
const path = require('path')
const express = require('express')
const bodyParser = require('body-parser')
const uuid = require('node-uuid')
const fs = require('fs')

const storeDir = path.join(__dirname, 'store')
const indexFile = path.join(storeDir, 'index.json')
const indexSize = 100
const storeUrl = '/store'
const listen = '6901'

const web = express()
web.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    next()
})
web.use(bodyParser.urlencoded({ extended: true }));
web.use(bodyParser.json());

// store
web.use(storeUrl, express.static(storeDir))

web.get('/api/v1/fswatcher', (req, res) => {
    res.sendFile(indexFile)
})

web.post('/api/v1/fswatcher', (req, res) => {
    // 受信データ保存
    let subdir = (new Date()).toFormat('YYYYMMDD')
    let dir = path.join(storeDir, subdir)
    let filename = uuid.v4() + '.json'
    let fullpath = path.join(dir, filename)
    let data = JSON.stringify(req.body)
    fs.writeFile(fullpath, data, (err) => {
        if (err) {
            console.log('Warning: write file failed. try mkdir.')
            fs.mkdir(dir, (err) => {
                if (err) {
                    console.log('Error: mkdir failed.', err)
                    res.status(403).json(err)
                    return
                }
                fs.writeFile(fullpath, data, (err) => {
                    if (err) {
                        console.log('Error: write file failed.', err)
                        res.status(403).json(err)
                        return
                    }
                })
            })
        }
        // indexファイル
        fs.readFile(indexFile, (err, data) => {
            if (err) {
                console.log('Error: index file read error.', err)
                res.status(403).json(err)
                return
            }
            let index
            try {
                index = JSON.parse(data)
            } catch (e) {
                console.log('Error: index file format error. not json.', e)
                res.status(403).json(e)
                return
            }
            if (!Array.isArray(index)) {
                console.log('Error: index file format error.', index)
                res.status(403).json({ error: "index file format error." })
                return
            }
            // レコード数制限
            while (index.length > indexSize - 1) { index.pop() }

            // 新規レコード追加
            index.unshift({
                href: storeUrl + '/' + subdir + '/' + filename,
                timestamp: new Date()
            })
            fs.writeFile(indexFile, JSON.stringify(index), (err) => {
                if (err) {
                    console.log('Error: index file write failed.', err)
                    res.status(403).json(err)
                    return
                }
                res.json(index)
            })
        })
    })
})

web.listen(listen, () => {
    console.log('feeder start at : ' + listen)
})
